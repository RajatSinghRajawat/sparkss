/**
 * Dashboard courses list – admin only.
 * GET /api/admin/dashboard/courses?page&limit&search
 * GET /api/admin/dashboard/courses/:courseId/video-url  → presigned video (and thumbnail) URL
 * POST /api/admin/dashboard/courses/upload  → multipart video + thumbnail (backend uploads to S3)
 * POST /api/admin/dashboard/courses  → create course (body: playlist, title, description?, duration?, videoKey, thumbnailKey?, createdBy)
 */

const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const Course = require("../models/course.model");
const Playlist = require("../models/playlist.model");
const Teacher = require("../models/teacher.model");
const { getS3Client, getS3Bucket, getS3Url, getPresignedViewUrl } = require("../config/s3");
const mongoose = require("mongoose");

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
const { escapeRegex } = require("../utils/escapeRegex");

const MIME_TO_EXT = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-msvideo": ".avi",
  "video/3gpp": ".3gp",
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
// @desc    Get all courses with pagination and search
// @route   GET /api/admin/dashboard/courses
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getCourseList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const search = (req.query.search || "").trim();

    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("createdBy", "name email")
        .populate("createdByAdmin", "name email")
        .populate("playlist", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("title description duration video thumbnail playlist createdBy createdByAdmin createdAt")
        .lean(),
      Course.countDocuments(filter),
    ]);

    const list = await Promise.all(courses.map(async (c) => ({
      _id: c._id.toString(),
      title: c.title || "",
      description: (c.description || "").slice(0, 100),
      duration: c.duration || 0,
      thumbnail: await signKey(c.thumbnail?.key),
      videoUrl: await signKey(c.video?.key),
      playlistId: c.playlist?._id?.toString(),
      playlistTitle: c.playlist?.name || "—",
      teacherName: c.createdBy?.name ?? c.createdByAdmin?.name ?? "Admin",
      teacherEmail: c.createdBy?.email ?? c.createdByAdmin?.email ?? "—",
      createdAt: c.createdAt,
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
    console.error("Dashboard getCourseList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load courses.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get presigned video URL for a course (admin watch)
// @route   GET /api/admin/dashboard/courses/:courseId/video-url
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getCourseVideoUrl = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Valid course ID is required." });
    }

    const course = await Course.findById(courseId).select("title video thumbnail").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const videoKey = course.video?.key;
    if (!videoKey) {
      return res.status(404).json({ success: false, message: "Course has no video." });
    }

    const videoUrl = await getPresignedViewUrl(videoKey, 3600);
    let thumbnailUrl = null;
    if (course.thumbnail?.key) {
      thumbnailUrl = await getPresignedViewUrl(course.thumbnail.key, 3600);
    }

    res.status(200).json({
      success: true,
      data: {
        title: course.title || "Course video",
        videoUrl,
        url: videoUrl, // the admin panel reads `url`
        thumbnailUrl,
      },
    });
  } catch (error) {
    console.error("Dashboard getCourseVideoUrl Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get video URL.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Upload course video + thumbnail (admin proxy upload to S3)
// @route   POST /api/admin/dashboard/courses/upload
// @access  Private (Admin)
// ─────────────────────────────────────────────
const uploadCourseMedia = async (req, res) => {
  try {
    const videoFile = req.files?.video?.[0];
    if (!videoFile || !videoFile.buffer) {
      return res.status(400).json({
        success: false,
        message: "Video file is required.",
      });
    }
    const s3Client = getS3Client();
    const bucket = getS3Bucket();
    const videoExt = MIME_TO_EXT[videoFile.mimetype] || ".mp4";
    const videoKey = `courses/videos/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${videoExt}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: videoKey,
        Body: videoFile.buffer,
        ContentType: videoFile.mimetype,
      })
    );

    let thumbnailKey = null;
    const thumbFile = req.files?.thumbnail?.[0];
    if (thumbFile && thumbFile.buffer) {
      const thumbExt = MIME_TO_EXT[thumbFile.mimetype] || ".jpg";
      thumbnailKey = `courses/thumbnails/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${thumbExt}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbFile.buffer,
          ContentType: thumbFile.mimetype,
        })
      );
    }

    res.status(200).json({
      success: true,
      message: "Upload complete",
      data: {
        videoKey,
        thumbnailKey,
        videoUrl: getS3Url(videoKey),
        thumbnailUrl: thumbnailKey ? getS3Url(thumbnailKey) : null,
      },
    });
  } catch (error) {
    console.error("Dashboard uploadCourseMedia Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to upload course media.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create course (admin assigns teacher and playlist)
// @route   POST /api/admin/dashboard/courses
// @access  Private (Admin)
// ─────────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const { playlist, title, description, duration, videoKey, thumbnailKey, createdBy: teacherId } = req.body;
    const teacherIdTrimmed = (teacherId || "").trim();
    if (!teacherIdTrimmed) {
      return res.status(400).json({ success: false, message: "Teacher is required." });
    }

    const teacher = await Teacher.findById(teacherIdTrimmed).lean();
    if (!teacher) {
      return res.status(400).json({ success: false, message: "Teacher not found." });
    }

    const playlistDoc = await Playlist.findOne({
      _id: playlist,
      $or: [{ createdBy: teacherIdTrimmed }, { createdByAdmin: req.user?.id }],
    }).lean();
    if (!playlistDoc) {
      return res.status(400).json({
        success: false,
        message: "Playlist not found or does not belong to the selected teacher (or admin).",
      });
    }

    const videoUrl = getS3Url(videoKey);
    const thumbnailUrl = thumbnailKey ? getS3Url(thumbnailKey) : null;

    const course = await Course.create({
      playlist,
      title: title.trim(),
      description: (description || "").trim(),
      video: { url: videoUrl, key: videoKey },
      thumbnail: thumbnailKey ? { url: thumbnailUrl, key: thumbnailKey } : { url: null, key: null },
      duration: duration ? Number(duration) : 0,
      createdBy: teacherIdTrimmed,
      isActive: true,
    });

    await course.populate([
      { path: "playlist", select: "name" },
      { path: "createdBy", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: {
        course: {
          _id: course._id.toString(),
          title: course.title,
          description: course.description || "",
          duration: course.duration || 0,
          playlistId: course.playlist?._id?.toString(),
          playlistTitle: course.playlist?.name || "—",
          teacherName: course.createdBy?.name ?? "—",
          teacherEmail: course.createdBy?.email ?? "—",
          createdAt: course.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard createCourse Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create course.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getCourseList, getCourseVideoUrl, uploadCourseMedia, createCourse };
