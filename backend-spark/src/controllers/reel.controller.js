const crypto = require("crypto");
const mongoose = require("mongoose");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const Reel = require("../models/reel.model");
const ReelLike = require("../models/reelLike.model");
const ReelSave = require("../models/reelSave.model");
const Follow = require("../models/follow.model");
const Category = require("../models/category.model");
const { generateUploadUrl, deleteFromS3 } = require("../helpers/fileHelper");
const { getS3Client, getS3Bucket, getS3Url, getPresignedViewUrl } = require("../config/s3");
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

// ─── Helper: Parse hashtags from string or array ───
const parseHashtags = (hashtags) => {
  if (!hashtags) return [];
  if (Array.isArray(hashtags)) {
    return hashtags
      .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);
  }
  if (typeof hashtags === "string") {
    return hashtags
      .split(",")
      .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);
  }
  return [];
};

// ─── Helper: Add presigned view URLs to a reel object ───
const addPresignedUrls = async (reel) => {
  const reelObj = reel.toJSON ? reel.toJSON() : { ...reel };

  // Generate presigned GET URL for video
  if (reelObj.video && reelObj.video.key) {
    reelObj.video.url = await getPresignedViewUrl(reelObj.video.key);
  }

  // Generate presigned GET URL for thumbnail
  if (reelObj.thumbnail && reelObj.thumbnail.key) {
    reelObj.thumbnail.url = await getPresignedViewUrl(reelObj.thumbnail.key);
  }

  return reelObj;
};

// ─── Helper: Add presigned URLs to array of reels ───
const addPresignedUrlsToReels = async (reels) => {
  return Promise.all(reels.map((reel) => addPresignedUrls(reel)));
};

// ─────────────────────────────────────────────
// @desc    Get presigned upload URLs for video & thumbnail
// @route   POST /api/reels/upload-url
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getUploadUrls = async (req, res) => {
  try {
    const { videoType, thumbnailType } = req.body;

    if (!videoType) {
      return res.status(400).json({
        success: false,
        message: "videoType (MIME type) is required. e.g. video/mp4",
      });
    }

    // Generate presigned URL for video
    const videoData = await generateUploadUrl("reels/videos", videoType);

    // Generate presigned URL for thumbnail (optional)
    let thumbnailData = null;
    if (thumbnailType) {
      thumbnailData = await generateUploadUrl("reels/thumbnails", thumbnailType);
    }

    console.log(`🔗 Upload URLs generated for teacher: ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Upload URLs generated",
      data: {
        video: {
          uploadUrl: videoData.uploadUrl,
          key: videoData.key,
          fileUrl: videoData.fileUrl,
        },
        thumbnail: thumbnailData
          ? {
              uploadUrl: thumbnailData.uploadUrl,
              key: thumbnailData.key,
              fileUrl: thumbnailData.fileUrl,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("❌ Get Upload URLs Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URLs.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Upload reel video + thumbnail via backend (teacher – avoids CORS)
// @route   POST /api/reels/upload
// @access  Private (Teacher)
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
    console.error("Reel uploadReelMedia Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to upload reel media.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create reel (after client uploads to S3)
// @route   POST /api/reels
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const createReel = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      title,
      description,
      category,
      hashtags,
      duration,
      videoKey,        // S3 key from presigned upload
      thumbnailKey,    // S3 key from presigned upload (optional)
    } = req.body;

    // Validate video key
    if (!videoKey) {
      return res.status(400).json({
        success: false,
        message: "videoKey is required. Upload the video first using the presigned URL.",
      });
    }

    // Verify category exists and belongs to this teacher
    const categoryDoc = await Category.findOne({
      _id: category,
      createdBy: teacherId,
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category not found or doesn't belong to you.",
      });
    }

    // Build S3 URLs from keys (stored as reference)
    const videoUrl = getS3Url(videoKey);
    const thumbnailUrl = thumbnailKey ? getS3Url(thumbnailKey) : null;

    // Build reel data
    const reelData = {
      title,
      description: description || "",
      video: {
        url: videoUrl,
        key: videoKey,
      },
      thumbnail: {
        url: thumbnailUrl,
        key: thumbnailKey || null,
      },
      category,
      hashtags: parseHashtags(hashtags),
      duration: duration ? Number(duration) : 0,
      createdBy: teacherId,
    };

    // Create reel in DB
    const reel = await Reel.create(reelData);

    // Populate references
    await reel.populate([
      { path: "category", select: "name" },
      { path: "createdBy", select: "name email" },
    ]);

    // Add presigned view URLs before sending response
    const reelWithUrls = await addPresignedUrls(reel);

    console.log(`🎬 Reel created: "${title}" by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: "Reel uploaded successfully! 🎬",
      data: { reel: reelWithUrls },
    });
  } catch (error) {
    console.error("❌ Create Reel Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create reel. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get all reels of logged-in teacher (with pagination, search, filter)
// @route   GET /api/reels
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getMyReels = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build query filter
    const filter = { createdBy: teacherId };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { hashtags: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    // Execute query
    const [reels, total] = await Promise.all([
      Reel.find(filter)
        .populate("category", "name")
        .populate("createdBy", "name email")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Reel.countDocuments(filter),
    ]);

    // Add presigned view URLs to each reel
    const reelsWithUrls = await addPresignedUrlsToReels(reels);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: "Reels fetched successfully",
      data: {
        reels: reelsWithUrls,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          hasMore: Number(page) < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get Reels Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reels.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get reels for students (active only, pagination + search)
// @route   GET /api/students/reels
// @access  Private (Student)
// ─────────────────────────────────────────────
const getReelsForStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: escapeRegex(search.trim()), $options: "i" } },
        { description: { $regex: escapeRegex(search.trim()), $options: "i" } },
        { hashtags: { $regex: escapeRegex(search.trim()), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [reels, total] = await Promise.all([
      Reel.find(filter)
        .populate("category", "name")
        .populate("createdBy", "name email")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Reel.countDocuments(filter),
    ]);

    const reelsWithUrls = await addPresignedUrlsToReels(reels);
    const totalPages = Math.ceil(total / Number(limit));

    const studentId = req.user?.id || null;
    const reelIds = reels.map((r) => r._id);

    let likedReelIds = new Set();
    let savedReelIds = new Set();
    let followedTeacherIds = new Set();
    if (studentId && reelIds.length > 0) {
      const teacherIds = [
        ...new Set(
          reels
            .map((r) => {
              const cb = r.createdBy;
              if (!cb) return null;
              return (cb._id ?? cb).toString();
            })
            .filter(Boolean)
        ),
      ];
      const [likedDocs, savedDocs, followDocs] = await Promise.all([
        ReelLike.find({ reel: { $in: reelIds }, likedBy: studentId }).select("reel").lean(),
        ReelSave.find({ reel: { $in: reelIds }, savedBy: studentId }).select("reel").lean(),
        teacherIds.length > 0
          ? Follow.find({ teacher: { $in: teacherIds }, followedBy: studentId }).select("teacher").lean()
          : Promise.resolve([]),
      ]);
      likedReelIds = new Set(likedDocs.map((d) => d.reel.toString()));
      savedReelIds = new Set(savedDocs.map((d) => d.reel.toString()));
      followedTeacherIds = new Set(followDocs.map((d) => d.teacher.toString()));
    }

    // ─── Followers count per teacher (kitne logo ne teacher ko follow kiya) ───
    let teacherFollowersCountMap = {};
    const teacherIdsForCount = [
      ...new Set(
        reels
          .map((r) => {
            const cb = r.createdBy;
            if (!cb) return null;
            return (cb._id ?? cb).toString();
          })
          .filter(Boolean)
      ),
    ];
    if (teacherIdsForCount.length > 0) {
      const counts = await Follow.aggregate([
        { $match: { teacher: { $in: teacherIdsForCount.map((id) => new mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: "$teacher", count: { $sum: 1 } } },
      ]);
      counts.forEach((c) => {
        teacherFollowersCountMap[c._id.toString()] = c.count;
      });
    }

    // ─── Add total views, total likes, isReelLike, isReelSave, isFollow, teacherFollowersCount for each reel (student API) ───
    const reelsWithStats = reelsWithUrls.map((reel) => {
      const teacherId = reel.createdBy?._id?.toString() ?? reel.createdBy?.toString();
      return {
        ...reel,
        totalViews: reel.views ?? 0,
        totalLikes: reel.likes ?? 0,
        isReelLike: likedReelIds.has(reel._id.toString()),
        isReelSave: savedReelIds.has(reel._id.toString()),
        isFollow: teacherId ? followedTeacherIds.has(teacherId) : false,
        teacherFollowersCount: teacherId ? (teacherFollowersCountMap[teacherId] ?? 0) : 0,
      };
    });

    res.status(200).json({
      success: true,
      message: "Reels fetched successfully",
      data: {
        reels: reelsWithStats,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          hasMore: Number(page) < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get Reels (Students) Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reels.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single reel by ID
// @route   GET /api/reels/:id
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getReelById = async (req, res) => {
  try {
    const reel = await Reel.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    })
      .populate("category", "name")
      .populate("createdBy", "name email");

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    // Add presigned view URLs
    const reelWithUrls = await addPresignedUrls(reel);

    res.status(200).json({
      success: true,
      data: { reel: reelWithUrls },
    });
  } catch (error) {
    console.error("❌ Get Reel Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reel.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update reel details
// @route   PUT /api/reels/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const updateReel = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, description, category, hashtags, duration } = req.body;

    // Find reel owned by this teacher
    const reel = await Reel.findOne({
      _id: req.params.id,
      createdBy: teacherId,
    });

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found or you don't have permission",
      });
    }

    // Verify category if being changed
    if (category && category !== reel.category.toString()) {
      const categoryDoc = await Category.findOne({
        _id: category,
        createdBy: teacherId,
      });
      if (!categoryDoc) {
        return res.status(404).json({
          success: false,
          message: "Category not found or doesn't belong to you.",
        });
      }
      reel.category = category;
    }

    // Update fields
    if (title) reel.title = title;
    if (description !== undefined) reel.description = description;
    if (hashtags !== undefined) reel.hashtags = parseHashtags(hashtags);
    if (duration !== undefined) reel.duration = Number(duration);

    await reel.save();

    await reel.populate([
      { path: "category", select: "name" },
      { path: "createdBy", select: "name email" },
    ]);

    // Add presigned view URLs
    const reelWithUrls = await addPresignedUrls(reel);

    console.log(`✏️ Reel updated: "${reel.title}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Reel updated successfully",
      data: { reel: reelWithUrls },
    });
  } catch (error) {
    console.error("❌ Update Reel Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update reel.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete reel (also deletes files from S3)
// @route   DELETE /api/reels/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found or you don't have permission",
      });
    }

    // Delete media files from S3
    if (reel.video && reel.video.key) {
      await deleteFromS3(reel.video.key);
    }
    if (reel.thumbnail && reel.thumbnail.key) {
      await deleteFromS3(reel.thumbnail.key);
    }

    // Delete from DB
    await Reel.deleteOne({ _id: reel._id });

    console.log(`🗑️ Reel deleted: "${reel.title}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Reel deleted successfully",
      data: { reel },
    });
  } catch (error) {
    console.error("❌ Delete Reel Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete reel.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getUploadUrls,
  uploadReelMedia,
  createReel,
  getMyReels,
  getReelsForStudents,
  getReelById,
  updateReel,
  deleteReel,
  addPresignedUrls,
  addPresignedUrlsToReels,
};
