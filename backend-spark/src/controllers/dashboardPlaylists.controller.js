/**
 * Dashboard playlists – admin only.
 * GET /api/admin/dashboard/playlists?page&limit&search
 * GET /api/admin/dashboard/playlists/:playlistId/detail
 * POST /api/admin/dashboard/playlists  → create playlist (body: name, description?, createdBy)
 */

const Playlist = require("../models/playlist.model");
const Course = require("../models/course.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const Teacher = require("../models/teacher.model");
const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { generateUploadUrl } = require("../helpers/fileHelper");
const { getS3Client, getS3Bucket, getS3Url, getPresignedViewUrl } = require("../config/s3");

// Admin lists show thumbnails and play videos inline; the bucket is private,
// so hand out signed URLs (null when the object is missing).
const signKey = async (key) => {
  if (!key) return null;
  try {
    return await getPresignedViewUrl(key, 3600);
  } catch {
    return null;
  }
};
const mongoose = require("mongoose");
const { escapeRegex } = require("../utils/escapeRegex");

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Get all playlists with pagination and search
// @route   GET /api/admin/dashboard/playlists
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getPlaylistList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const search = (req.query.search || "").trim();
    const teacherId = (req.query.teacherId || "").trim();

    const filter = { isActive: true };
    const andConditions = [];
    if (teacherId === "__admin__") {
      andConditions.push({ createdByAdmin: req.user?.id, createdBy: null });
    } else if (teacherId) {
      andConditions.push({ $or: [{ createdBy: teacherId }, { createdByAdmin: req.user?.id }] });
    }
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: escapeRegex(search), $options: "i" } },
          { description: { $regex: escapeRegex(search), $options: "i" } },
        ],
      });
    }
    if (andConditions.length) filter.$and = andConditions;

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate("createdBy", "name email")
        .populate("createdByAdmin", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name description banner createdBy createdByAdmin isActive createdAt")
        .lean(),
      Playlist.countDocuments(filter),
    ]);

    const list = await Promise.all(playlists.map(async (p) => ({
      _id: p._id.toString(),
      name: p.name || "",
      description: (p.description || "").slice(0, 120),
      banner: await signKey(p.banner?.key),
      teacherName: p.createdBy?.name ?? p.createdByAdmin?.name ?? "Admin",
      teacherEmail: p.createdBy?.email ?? p.createdByAdmin?.email ?? "—",
      ownerType: p.createdBy ? "teacher" : "admin",
      isActive: !!p.isActive,
      createdAt: p.createdAt,
    })));

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
    console.error("Dashboard getPlaylistList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load playlists.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get playlist detail: info + courses (videos) + enrolled students
// @route   GET /api/admin/dashboard/playlists/:playlistId/detail
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getPlaylistDetail = async (req, res) => {
  try {
    const { playlistId } = req.params;
    if (!playlistId || !mongoose.isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Valid playlist ID is required." });
    }

    const playlist = await Playlist.findById(playlistId)
      .populate("createdBy", "name email")
      .populate("createdByAdmin", "name email")
      .select("name description banner createdBy createdByAdmin isActive createdAt")
      .lean();
    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found." });
    }

    const [courses, enrollees] = await Promise.all([
      Course.find({ playlist: playlistId, isActive: true })
        .select("title description duration video thumbnail createdAt")
        .sort({ createdAt: 1 })
        .lean(),
      PlaylistEnrollment.find({ playlist: playlistId })
        .populate("student", "name email")
        .lean(),
    ]);

    const courseList = await Promise.all(courses.map(async (c) => ({
      _id: c._id.toString(),
      title: c.title || "",
      description: c.description || "",
      duration: c.duration || 0,
      thumbnail: await signKey(c.thumbnail?.key),
      videoUrl: await signKey(c.video?.key),
      createdAt: c.createdAt,
    })));

    const enrolleeList = enrollees.map((e) => ({
      _id: e._id.toString(),
      studentId: e.student?._id?.toString(),
      studentName: e.student?.name ?? "—",
      studentEmail: e.student?.email ?? "—",
      enrolledAt: e.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        playlist: {
          _id: playlist._id.toString(),
          name: playlist.name,
          description: playlist.description || "",
          banner: await signKey(playlist.banner?.key),
          teacherId: playlist.createdBy?._id?.toString() ?? null,
          teacherName: playlist.createdBy?.name ?? playlist.createdByAdmin?.name ?? "Admin",
          teacherEmail: playlist.createdBy?.email ?? playlist.createdByAdmin?.email ?? "—",
          ownerType: playlist.createdBy ? "teacher" : "admin",
          isActive: !!playlist.isActive,
          createdAt: playlist.createdAt,
        },
        courses: courseList,
        enrolledCount: enrolleeList.length,
        enrollees: enrolleeList,
      },
    });
  } catch (error) {
    console.error("Dashboard getPlaylistDetail Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load playlist detail.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get presigned URL for playlist banner upload (admin) – kept for compatibility
// @route   POST /api/admin/dashboard/playlists/upload-url
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getBannerUploadUrl = async (req, res) => {
  try {
    const { bannerType } = req.body;
    if (!bannerType) {
      return res.status(400).json({
        success: false,
        message: "bannerType (MIME type) is required. e.g. image/jpeg",
      });
    }
    const bannerData = await generateUploadUrl("playlists/banners", bannerType);
    res.status(200).json({
      success: true,
      message: "Upload URL generated",
      data: {
        banner: {
          uploadUrl: bannerData.uploadUrl,
          key: bannerData.key,
          fileUrl: bannerData.fileUrl,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard getBannerUploadUrl Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URL.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Upload playlist banner via backend (avoids CORS; server uploads to S3)
// @route   POST /api/admin/dashboard/playlists/upload-banner
// @access  Private (Admin)
// ─────────────────────────────────────────────
const uploadPlaylistBannerFile = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required.",
      });
    }
    const ext = MIME_TO_EXT[req.file.mimetype] || ".jpg";
    const key = `playlists/banners/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const s3Client = getS3Client();
    const bucket = getS3Bucket();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const fileUrl = getS3Url(key);
    res.status(200).json({
      success: true,
      message: "Banner uploaded",
      data: { banner: { key, fileUrl } },
    });
  } catch (error) {
    console.error("Dashboard uploadPlaylistBannerFile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to upload banner.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create playlist (admin assigns teacher as owner)
// @route   POST /api/admin/dashboard/playlists
// @access  Private (Admin)
// ─────────────────────────────────────────────
const createPlaylist = async (req, res) => {
  try {
    const { name, description, createdBy: teacherId, bannerKey } = req.body;
    const adminId = req.user?.id;

    const playlistData = {
      name: name.trim(),
      description: (description || "").trim(),
      isActive: true,
    };
    if (bannerKey) {
      playlistData.banner = { url: getS3Url(bannerKey), key: bannerKey };
    }

    if (teacherId) {
      const teacher = await Teacher.findById(teacherId).select("name email").lean();
      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: "Teacher not found.",
        });
      }
      const existing = await Playlist.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
        createdBy: teacherId,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "This teacher already has a playlist with this name.",
        });
      }
      playlistData.createdBy = teacherId;
      playlistData.createdByAdmin = null;
    } else {
      const existing = await Playlist.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
        createdByAdmin: adminId,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You already have a playlist with this name.",
        });
      }
      playlistData.createdBy = null;
      playlistData.createdByAdmin = adminId;
    }

    const playlist = await Playlist.create(playlistData);

    await playlist.populate("createdBy", "name email");
    await playlist.populate("createdByAdmin", "name email");

    const listItem = {
      _id: playlist._id.toString(),
      name: playlist.name,
      description: playlist.description || "",
      teacherName: playlist.createdBy?.name ?? playlist.createdByAdmin?.name ?? "Admin",
      teacherEmail: playlist.createdBy?.email ?? playlist.createdByAdmin?.email ?? "—",
      ownerType: playlist.createdBy ? "teacher" : "admin",
      isActive: !!playlist.isActive,
      createdAt: playlist.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: { playlist: listItem },
    });
  } catch (error) {
    console.error("Dashboard createPlaylist Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create playlist.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getPlaylistList,
  getPlaylistDetail,
  getBannerUploadUrl,
  uploadPlaylistBannerFile,
  createPlaylist,
};
