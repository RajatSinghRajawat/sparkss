/**
 * Dashboard teachers – admin only.
 * GET /api/admin/dashboard/teachers?page&limit&search&status=all|active|inactive
 * GET /api/admin/dashboard/teachers/:teacherId
 * PATCH /api/admin/dashboard/teachers/:teacherId  { name?, email?, phone?, isActive? }
 */

const Teacher = require("../models/teacher.model");
const Playlist = require("../models/playlist.model");
const Course = require("../models/course.model");
const Reel = require("../models/reel.model");
const Video = require("../models/video.model");
const Category = require("../models/category.model");
const Follow = require("../models/follow.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const mongoose = require("mongoose");
const { escapeRegex } = require("../utils/escapeRegex");
const { signStoredUrl, getPresignedViewUrl } = require("../config/s3");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Get teachers list with pagination, search, status filter
// @route   GET /api/admin/dashboard/teachers
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTeacherList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const search = (req.query.search || "").trim();
    const status = req.query.status === "inactive" ? "inactive" : req.query.status === "active" ? "active" : "all";

    const filter = {};
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
        { phone: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const [teachers, total] = await Promise.all([
      Teacher.find(filter)
        .select("name email phone isActive isVerified createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Teacher.countDocuments(filter),
    ]);

    const list = teachers.map((t) => ({
      _id: t._id.toString(),
      name: t.name || "",
      email: t.email || "",
      phone: t.phone || "",
      isActive: !!t.isActive,
      isVerified: !!t.isVerified,
      createdAt: t.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard getTeacherList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load teachers.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single teacher by ID (detail)
// @route   GET /api/admin/dashboard/teachers/:teacherId
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTeacherById = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, message: "Valid teacher ID is required." });
    }

    const teacher = await Teacher.findById(teacherId)
      .select("name email phone isActive isVerified avatar createdAt updatedAt")
      .lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    // Activity summary for the admin profile view.
    const [playlists, courses, videos, reels, categories, followers, reelViewsAgg] = await Promise.all([
      Playlist.countDocuments({ createdBy: teacherId }),
      Course.countDocuments({ createdBy: teacherId, isActive: true }),
      Video.countDocuments({ createdBy: teacherId, isActive: true }),
      Reel.countDocuments({ createdBy: teacherId, isActive: true }),
      Category.countDocuments({ createdBy: teacherId }),
      Follow.countDocuments({ teacher: teacherId }),
      Reel.aggregate([
        { $match: { createdBy: new mongoose.Types.ObjectId(teacherId), isActive: true } },
        { $group: { _id: null, views: { $sum: "$views" }, likes: { $sum: "$likes" } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          _id: teacher._id.toString(),
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          isActive: !!teacher.isActive,
          isVerified: !!teacher.isVerified,
          avatar: await signStoredUrl(teacher.avatar),
          createdAt: teacher.createdAt,
          updatedAt: teacher.updatedAt,
        },
        stats: {
          playlists,
          courses,
          videos,
          reels,
          categories,
          followers,
          reelViews: reelViewsAgg[0]?.views ?? 0,
          reelLikes: reelViewsAgg[0]?.likes ?? 0,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard getTeacherById Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load teacher.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update teacher (name, email, phone, isActive)
// @route   PATCH /api/admin/dashboard/teachers/:teacherId
// @access  Private (Admin)
// ─────────────────────────────────────────────
const updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { name, email, phone, isActive } = req.body;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, message: "Valid teacher ID is required." });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    if (name !== undefined) teacher.name = String(name).trim();
    if (email !== undefined) teacher.email = String(email).toLowerCase().trim();
    if (phone !== undefined) teacher.phone = String(phone).trim();
    if (typeof isActive === "boolean") teacher.isActive = isActive;

    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: {
        teacher: {
          _id: teacher._id.toString(),
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          isActive: teacher.isActive,
          isVerified: teacher.isVerified,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard updateTeacher Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update teacher.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// Signed GET URL for a private S3 object; null when missing or unsignable.
const signKey = async (key) => {
  if (!key) return null;
  try {
    return await getPresignedViewUrl(key, 3600);
  } catch {
    return null;
  }
};

const CONTENT_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Everything a teacher has published, for the admin profile page
// @route   GET /api/admin/dashboard/teachers/:teacherId/content
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTeacherContent = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, message: "Valid teacher ID is required." });
    }
    if (!(await Teacher.exists({ _id: teacherId }))) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    const [reels, courses, videos, playlists, categories] = await Promise.all([
      Reel.find({ createdBy: teacherId })
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .limit(CONTENT_LIMIT)
        .select("title description video thumbnail category hashtags duration views likes isActive createdAt")
        .lean(),
      Course.find({ createdBy: teacherId })
        .populate("playlist", "name")
        .sort({ createdAt: -1 })
        .limit(CONTENT_LIMIT)
        .select("title description video thumbnail playlist duration isActive createdAt")
        .lean(),
      Video.find({ createdBy: teacherId })
        .sort({ createdAt: -1 })
        .limit(CONTENT_LIMIT)
        .select("title description video thumbnail duration isActive createdAt")
        .lean(),
      Playlist.find({ createdBy: teacherId })
        .sort({ createdAt: -1 })
        .limit(CONTENT_LIMIT)
        .select("name description banner isActive createdAt")
        .lean(),
      Category.find({ createdBy: teacherId }).sort({ name: 1 }).select("name createdAt").lean(),
    ]);

    // Per-playlist video and enrolment counts in two grouped queries.
    const playlistIds = playlists.map((p) => p._id);
    const [courseCounts, enrollCounts] = await Promise.all([
      Course.aggregate([
        { $match: { playlist: { $in: playlistIds }, isActive: true } },
        { $group: { _id: "$playlist", n: { $sum: 1 } } },
      ]),
      PlaylistEnrollment.aggregate([
        { $match: { playlist: { $in: playlistIds } } },
        { $group: { _id: "$playlist", n: { $sum: 1 } } },
      ]),
    ]);
    const countBy = (rows) => Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
    const coursesPer = countBy(courseCounts);
    const enrollPer = countBy(enrollCounts);

    const media = async (doc) => ({
      thumbnail: await signKey(doc.thumbnail?.key),
      videoUrl: await signKey(doc.video?.key),
    });

    res.status(200).json({
      success: true,
      data: {
        reels: await Promise.all(
          reels.map(async (r) => ({
            _id: r._id.toString(),
            title: r.title,
            description: r.description || "",
            category: r.category?.name ?? null,
            hashtags: r.hashtags ?? [],
            duration: r.duration || 0,
            views: r.views || 0,
            likes: r.likes || 0,
            isActive: r.isActive !== false,
            createdAt: r.createdAt,
            ...(await media(r)),
          }))
        ),
        courses: await Promise.all(
          courses.map(async (c) => ({
            _id: c._id.toString(),
            title: c.title,
            description: c.description || "",
            playlist: c.playlist ? { _id: c.playlist._id.toString(), name: c.playlist.name } : null,
            duration: c.duration || 0,
            isActive: c.isActive !== false,
            createdAt: c.createdAt,
            ...(await media(c)),
          }))
        ),
        videos: await Promise.all(
          videos.map(async (v) => ({
            _id: v._id.toString(),
            title: v.title,
            description: v.description || "",
            duration: v.duration || 0,
            isActive: v.isActive !== false,
            createdAt: v.createdAt,
            ...(await media(v)),
          }))
        ),
        playlists: await Promise.all(
          playlists.map(async (p) => ({
            _id: p._id.toString(),
            name: p.name,
            description: p.description || "",
            banner: await signKey(p.banner?.key),
            videoCount: coursesPer[String(p._id)] ?? 0,
            enrolledCount: enrollPer[String(p._id)] ?? 0,
            isActive: p.isActive !== false,
            createdAt: p.createdAt,
          }))
        ),
        categories: categories.map((c) => ({ _id: c._id.toString(), name: c.name })),
      },
    });
  } catch (error) {
    console.error("Dashboard getTeacherContent Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load teacher content.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getTeacherList, getTeacherById, updateTeacher, getTeacherContent };
