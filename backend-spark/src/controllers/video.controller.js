const Video = require("../models/video.model");
const { generateUploadUrl, deleteFromS3 } = require("../helpers/fileHelper");
const { getS3Url, getPresignedViewUrl } = require("../config/s3");
const { escapeRegex } = require("../utils/escapeRegex");

const addPresignedUrls = async (video) => {
  const obj = video.toJSON ? video.toJSON() : { ...video };
  if (obj.video && obj.video.key) {
    obj.video.url = await getPresignedViewUrl(obj.video.key);
  }
  if (obj.thumbnail && obj.thumbnail.key) {
    obj.thumbnail.url = await getPresignedViewUrl(obj.thumbnail.key);
  }
  return obj;
};

const addPresignedUrlsToVideos = async (videos) => {
  return Promise.all(videos.map((v) => addPresignedUrls(v)));
};

// ─── POST /api/videos/upload-url ───
const getUploadUrls = async (req, res) => {
  try {
    const { videoType, thumbnailType } = req.body;
    if (!videoType) {
      return res.status(400).json({
        success: false,
        message: "videoType (MIME type) is required. e.g. video/mp4",
      });
    }
    const videoData = await generateUploadUrl("videos/videos", videoType);
    let thumbnailData = null;
    if (thumbnailType) {
      thumbnailData = await generateUploadUrl("videos/thumbnails", thumbnailType);
    }
    console.log(`🔗 Video upload URLs generated for teacher: ${req.user.name}`);
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
    console.error("❌ Get Video Upload URLs Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URLs.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── POST /api/videos ───
const createVideo = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, description, duration, videoKey, thumbnailKey } = req.body;

    if (!videoKey) {
      return res.status(400).json({
        success: false,
        message: "videoKey is required. Upload the video first using the presigned URL.",
      });
    }

    const videoUrl = getS3Url(videoKey);
    const thumbnailUrl = thumbnailKey ? getS3Url(thumbnailKey) : null;

    const videoData = {
      title,
      description: description || "",
      video: { url: videoUrl, key: videoKey },
      thumbnail: { url: thumbnailUrl, key: thumbnailKey || null },
      duration: duration ? Number(duration) : 0,
      createdBy: teacherId,
    };

    const video = await Video.create(videoData);
    await video.populate("createdBy", "name email");
    const videoWithUrls = await addPresignedUrls(video);

    console.log(`📹 Video created: "${title}" by ${req.user.name}`);
    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Create Video Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create video. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── GET /api/videos ───
const getMyVideos = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = { createdBy: teacherId };
    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .populate("createdBy", "name email")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Video.countDocuments(filter),
    ]);

    const videosWithUrls = await addPresignedUrlsToVideos(videos);
    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: "Videos fetched successfully",
      data: {
        videos: videosWithUrls,
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
    console.error("❌ Get Videos Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── GET /api/videos/:id ───
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    }).populate("createdBy", "name email");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const videoWithUrls = await addPresignedUrls(video);
    res.status(200).json({
      success: true,
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Get Video Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── PUT /api/videos/:id ───
const updateVideo = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, description, duration, videoKey, thumbnailKey } = req.body;

    const video = await Video.findOne({
      _id: req.params.id,
      createdBy: teacherId,
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found or you don't have permission",
      });
    }

    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (duration !== undefined) video.duration = Number(duration);

    if (videoKey) {
      if (video.video && video.video.key) await deleteFromS3(video.video.key);
      video.video = { url: getS3Url(videoKey), key: videoKey };
    }
    if (thumbnailKey !== undefined) {
      if (video.thumbnail && video.thumbnail.key) await deleteFromS3(video.thumbnail.key);
      video.thumbnail = thumbnailKey
        ? { url: getS3Url(thumbnailKey), key: thumbnailKey }
        : { url: null, key: null };
    }

    await video.save();
    await video.populate("createdBy", "name email");
    const videoWithUrls = await addPresignedUrls(video);

    console.log(`✏️ Video updated: "${video.title}" by ${req.user.name}`);
    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Update Video Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update video.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── DELETE /api/videos/:id ───
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found or you don't have permission",
      });
    }

    if (video.video && video.video.key) await deleteFromS3(video.video.key);
    if (video.thumbnail && video.thumbnail.key) await deleteFromS3(video.thumbnail.key);
    await Video.deleteOne({ _id: video._id });

    console.log(`🗑️ Video deleted: "${video.title}" by ${req.user.name}`);
    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      data: { video },
    });
  } catch (error) {
    console.error("❌ Delete Video Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete video.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getUploadUrls,
  createVideo,
  getMyVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
};
