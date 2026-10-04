/**
 * Dashboard students – admin only.
 * GET /api/admin/dashboard/students?page&limit&search&status=all|active|inactive
 * GET /api/admin/dashboard/students/:studentId
 * PATCH /api/admin/dashboard/students/:studentId  { name?, email?, phone?, isActive? }
 */

const Student = require("../models/student.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const ReelSave = require("../models/reelSave.model");
const ReelLike = require("../models/reelLike.model");
const Follow = require("../models/follow.model");
const Result = require("../models/result.model");
const Course = require("../models/course.model");
const mongoose = require("mongoose");
const { escapeRegex } = require("../utils/escapeRegex");
const { signStoredUrl, getPresignedViewUrl } = require("../config/s3");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Get students list with pagination, search, status filter
// @route   GET /api/admin/dashboard/students
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getStudentList = async (req, res) => {
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
        ...(search.match(/^\d+$/) ? [{ phone: { $regex: escapeRegex(search), $options: "i" } }] : []),
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .select("name email phone isActive isVerified createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Student.countDocuments(filter),
    ]);

    const list = students.map((s) => ({
      _id: s._id.toString(),
      name: s.name || "",
      email: s.email || "",
      phone: s.phone || "",
      isActive: !!s.isActive,
      isVerified: !!s.isVerified,
      createdAt: s.createdAt,
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
    console.error("Dashboard getStudentList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load students.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single student by ID (detail)
// @route   GET /api/admin/dashboard/students/:studentId
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Valid student ID is required." });
    }

    const student = await Student.findById(studentId)
      .select("name email phone isActive isVerified avatar createdAt updatedAt")
      .lean();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    // Activity summary for the admin profile view.
    const [enrollments, savedReels, likedReels, following, testsAttempted] = await Promise.all([
      PlaylistEnrollment.find({ student: studentId }).populate("playlist", "name").lean(),
      ReelSave.countDocuments({ savedBy: studentId }),
      ReelLike.countDocuments({ likedBy: studentId }),
      Follow.countDocuments({ followedBy: studentId }),
      Result.countDocuments({ student: studentId, "answers.0": { $exists: true } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id.toString(),
          name: student.name,
          email: student.email,
          phone: student.phone || null,
          isActive: !!student.isActive,
          isVerified: !!student.isVerified,
          avatar: await signStoredUrl(student.avatar),
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
        stats: {
          enrolledPlaylists: enrollments.length,
          savedReels,
          likedReels,
          following,
          testsAttempted,
        },
        enrolledPlaylists: enrollments
          .filter((e) => e.playlist)
          .map((e) => ({ _id: e.playlist._id.toString(), name: e.playlist.name })),
      },
    });
  } catch (error) {
    console.error("Dashboard getStudentById Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load student.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update student (name, email, phone, isActive)
// @route   PATCH /api/admin/dashboard/students/:studentId
// @access  Private (Admin)
// ─────────────────────────────────────────────
const updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, email, phone, isActive } = req.body;

    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Valid student ID is required." });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    if (name !== undefined) student.name = String(name).trim();
    if (email !== undefined) student.email = String(email).toLowerCase().trim();
    if (phone !== undefined) student.phone = phone ? String(phone).trim() : null;
    if (typeof isActive === "boolean") student.isActive = isActive;

    await student.save();

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: {
        student: {
          _id: student._id.toString(),
          name: student.name,
          email: student.email,
          phone: student.phone || "",
          isActive: student.isActive,
          isVerified: student.isVerified,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard updateStudent Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update student.",
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

const ACTIVITY_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    What a student has done in the app, for the admin profile page
// @route   GET /api/admin/dashboard/students/:studentId/activity
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getStudentActivity = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Valid student ID is required." });
    }
    if (!(await Student.exists({ _id: studentId }))) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const reelPopulate = {
      path: "reel",
      select: "title video thumbnail duration views likes createdBy",
      populate: { path: "createdBy", select: "name" },
    };
    const [enrollments, saves, likes, follows, results] = await Promise.all([
      PlaylistEnrollment.find({ student: studentId })
        .populate({ path: "playlist", select: "name description banner createdBy", populate: { path: "createdBy", select: "name" } })
        .sort({ createdAt: -1 })
        .limit(ACTIVITY_LIMIT)
        .lean(),
      ReelSave.find({ savedBy: studentId }).populate(reelPopulate).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).lean(),
      ReelLike.find({ likedBy: studentId }).populate(reelPopulate).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).lean(),
      Follow.find({ followedBy: studentId }).populate("teacher", "name email avatar").sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).lean(),
      Result.find({ student: studentId })
        .populate("test", "title questions startTime endTime")
        .sort({ startedAt: -1 })
        .limit(ACTIVITY_LIMIT)
        .lean(),
    ]);

    const playlistIds = enrollments.filter((e) => e.playlist).map((e) => e.playlist._id);
    const courseCounts = await Course.aggregate([
      { $match: { playlist: { $in: playlistIds }, isActive: true } },
      { $group: { _id: "$playlist", n: { $sum: 1 } } },
    ]);
    const coursesPer = Object.fromEntries(courseCounts.map((r) => [String(r._id), r.n]));

    const mapReel = async (row) => {
      const r = row.reel;
      if (!r) return null; // reel deleted since
      return {
        _id: r._id.toString(),
        title: r.title,
        teacherName: r.createdBy?.name ?? "Admin",
        duration: r.duration || 0,
        views: r.views || 0,
        likes: r.likes || 0,
        thumbnail: await signKey(r.thumbnail?.key),
        videoUrl: await signKey(r.video?.key),
        at: row.createdAt,
      };
    };
    const clean = (arr) => arr.filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        enrolledPlaylists: clean(
          await Promise.all(
            enrollments.map(async (e) =>
              e.playlist
                ? {
                    _id: e.playlist._id.toString(),
                    name: e.playlist.name,
                    description: e.playlist.description || "",
                    teacherName: e.playlist.createdBy?.name ?? "Admin",
                    banner: await signKey(e.playlist.banner?.key),
                    videoCount: coursesPer[String(e.playlist._id)] ?? 0,
                    enrolledAt: e.createdAt,
                  }
                : null
            )
          )
        ),
        savedReels: clean(await Promise.all(saves.map(mapReel))),
        likedReels: clean(await Promise.all(likes.map(mapReel))),
        following: clean(
          await Promise.all(
            follows.map(async (f) =>
              f.teacher
                ? {
                    _id: f.teacher._id.toString(),
                    name: f.teacher.name,
                    email: f.teacher.email,
                    avatar: await signStoredUrl(f.teacher.avatar),
                    followedAt: f.createdAt,
                  }
                : null
            )
          )
        ),
        testResults: results.map((r) => {
          const answered = r.answers?.length ?? 0;
          const correct = (r.answers ?? []).filter((a) => a.isCorrect).length;
          const total = r.test?.questions?.length ?? answered;
          return {
            _id: r._id.toString(),
            testId: r.test?._id?.toString() ?? null,
            testTitle: r.test?.title ?? "Deleted test",
            totalQuestions: total,
            answered,
            correct,
            scorePercent: total > 0 ? Math.round((correct / total) * 100) : 0,
            completed: !!r.completedAt,
            startedAt: r.startedAt,
            completedAt: r.completedAt,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Dashboard getStudentActivity Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load student activity.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getStudentList, getStudentById, updateStudent, getStudentActivity };
