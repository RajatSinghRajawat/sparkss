/**
 * Dashboard reels – admin only.
 * GET /api/admin/dashboard/reels?page&limit&search
 * GET /api/admin/dashboard/reels/:reelId/video-url
 * POST /api/admin/dashboard/reels/upload  → multipart video + thumbnail (backend uploads to S3)
 * POST /api/admin/dashboard/reels  → create reel (body: title, description?, category, hashtags?, duration?, videoKey, thumbnailKey?, createdBy)
 */

const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const Reel = require("../models/reel.model");
const Category = require("../models/category.model");
const { getS3Client, getS3Bucket, getS3Url, getPresignedViewUrl } = require("../config/s3");
const mongoose = require("mongoose");
const { escapeRegex } = require("../utils/escapeRegex");

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

const parseHashtags = (hashtags) => {
  if (!hashtags) return [];
  if (Array.isArray(hashtags)) return hashtags.map((t) => String(t).trim().toLowerCase().replace(/^#/, "")).filter(Boolean);
  if (typeof hashtags === "string") return hashtags.split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean);
  return [];
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Get all reels with pagination, search (views & likes included)
// @route   GET /api/admin/dashboard/reels
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getReelList = async (req, res) => {
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

    const [reels, total] = await Promise.all([
      Reel.find(filter)
        .populate("createdBy", "name email")
        .populate("createdByAdmin", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("title description views likes duration video thumbnail createdBy createdByAdmin createdAt")
        .lean(),
      Reel.countDocuments(filter),
    ]);

    const list = await Promise.all(reels.map(async (r) => ({
      _id: r._id.toString(),
      title: r.title || "",
      description: (r.description || "").slice(0, 100),
      views: r.views || 0,
      likes: r.likes || 0,
      duration: r.duration || 0,
      thumbnail: await signKey(r.thumbnail?.key),
      videoUrl: await signKey(r.video?.key),
      teacherName: r.createdBy?.name ?? r.createdByAdmin?.name ?? "Admin",
      teacherEmail: r.createdBy?.email ?? r.createdByAdmin?.email ?? "—",
      createdAt: r.createdAt,
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
    console.error("Dashboard getReelList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load reels.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get presigned video URL for a reel (admin watch)
// @route   GET /api/admin/dashboard/reels/:reelId/video-url
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getReelVideoUrl = async (req, res) => {
  try {
    const { reelId } = req.params;
    if (!reelId || !mongoose.isValidObjectId(reelId)) {
      return res.status(400).json({ success: false, message: "Valid reel ID is required." });
    }

    const reel = await Reel.findById(reelId).select("title video thumbnail").lean();
    if (!reel) {
      return res.status(404).json({ success: false, message: "Reel not found." });
    }

    const videoKey = reel.video?.key;
    if (!videoKey) {
      return res.status(404).json({ success: false, message: "Reel has no video." });
    }

    const videoUrl = await getPresignedViewUrl(videoKey, 3600);

    res.status(200).json({
      success: true,
      data: {
        title: reel.title || "Reel",
        videoUrl,
        url: videoUrl, // the admin panel reads `url`
        thumbnailUrl: await signKey(reel.thumbnail?.key),
      },
    });
  } catch (error) {
    console.error("Dashboard getReelVideoUrl Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get video URL.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Upload reel video + thumbnail (admin proxy upload to S3)
// @route   POST /api/admin/dashboard/reels/upload
// @access  Private (Admin)
// ─────────────────────────────────────────────
const uploadReelMedia = async (req, res) => {
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
    const videoKey = `reels/videos/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${videoExt}`;

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
      thumbnailKey = `reels/thumbnails/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${thumbExt}`;
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
    console.error("Dashboard uploadReelMedia Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to upload reel media.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create reel (admin assigns teacher)
// @route   POST /api/admin/dashboard/reels
// @access  Private (Admin)
// ─────────────────────────────────────────────
const createReel = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { title, description, category, hashtags, duration, videoKey, thumbnailKey, createdBy: teacherId } = req.body;
    const teacherIdTrimmed = typeof teacherId === "string" ? teacherId.trim() : teacherId;
    const isAdminOwner = !teacherIdTrimmed || teacherIdTrimmed === "";

    const categoryFilter = isAdminOwner
      ? { _id: category, createdByAdmin: adminId }
      : { _id: category, createdBy: teacherIdTrimmed };
    const categoryDoc = await Category.findOne(categoryFilter).lean();
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: isAdminOwner
          ? "Category not found or does not belong to you (admin)."
          : "Category not found or does not belong to the selected teacher.",
      });
    }

    const videoUrl = getS3Url(videoKey);
    const thumbnailUrl = thumbnailKey ? getS3Url(thumbnailKey) : null;

    const reelData = {
      title: title.trim(),
      description: (description || "").trim(),
      video: { url: videoUrl, key: videoKey },
      thumbnail: thumbnailKey ? { url: thumbnailUrl, key: thumbnailKey } : { url: null, key: null },
      category,
      hashtags: parseHashtags(hashtags),
      duration: duration ? Number(duration) : 0,
      isActive: true,
    };
    if (isAdminOwner) {
      reelData.createdBy = null;
      reelData.createdByAdmin = adminId;
    } else {
      reelData.createdBy = teacherIdTrimmed;
      reelData.createdByAdmin = null;
    }

    const reel = await Reel.create(reelData);

    await reel.populate([
      { path: "category", select: "name" },
      { path: "createdBy", select: "name email" },
      { path: "createdByAdmin", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Reel created successfully",
      data: {
        reel: {
          _id: reel._id.toString(),
          title: reel.title,
          description: reel.description || "",
          views: reel.views || 0,
          likes: reel.likes || 0,
          duration: reel.duration || 0,
          teacherName: reel.createdBy?.name ?? reel.createdByAdmin?.name ?? "Admin",
          teacherEmail: reel.createdBy?.email ?? reel.createdByAdmin?.email ?? "—",
          createdAt: reel.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard createReel Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create reel.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getReelList, getReelVideoUrl, uploadReelMedia, createReel };
