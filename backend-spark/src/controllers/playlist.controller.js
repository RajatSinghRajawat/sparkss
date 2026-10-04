const Playlist = require("../models/playlist.model");
const Course = require("../models/course.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const CourseRating = require("../models/courseRating.model");
const { generateUploadUrl, deleteFromS3 } = require("../helpers/fileHelper");
const { getS3Url, getPresignedViewUrl, signStoredUrl } = require("../config/s3");
const { escapeRegex } = require("../utils/escapeRegex");

// ─── Helper: Add presigned view URL to banner ───
const addPresignedBannerUrl = async (playlist) => {
  const obj = playlist.toJSON ? playlist.toJSON() : { ...playlist };
  if (obj.banner && obj.banner.key) {
    obj.banner.url = await getPresignedViewUrl(obj.banner.key);
  }
  if (obj.createdBy && obj.createdBy.avatar) {
    obj.createdBy = { ...obj.createdBy, avatar: await signStoredUrl(obj.createdBy.avatar) };
  }
  return obj;
};

// ─── Helper: Add presigned URLs to array of playlists ───
const addPresignedBannerUrls = async (playlists) => {
  return Promise.all(playlists.map((p) => addPresignedBannerUrl(p)));
};

// ─────────────────────────────────────────────
// @desc    Get presigned URL for banner upload
// @route   POST /api/playlists/upload-url
// @access  Private (Teacher)
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

    console.log(`🔗 Playlist banner upload URL generated for: ${req.user.name}`);

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
    console.error("❌ Get Banner Upload URL Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URL.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create a new playlist
// @route   POST /api/playlists
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const createPlaylist = async (req, res) => {
  try {
    const { name, description, bannerKey } = req.body;
    const teacherId = req.user.id;

    // Check for duplicate name (case-insensitive)
    const existing = await Playlist.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      createdBy: teacherId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have a playlist with this name.",
      });
    }

    // Build playlist data
    const playlistData = {
      name,
      description: description || "",
      banner: bannerKey
        ? {
            url: getS3Url(bannerKey),
            key: bannerKey,
          }
        : { url: null, key: null },
      createdBy: teacherId,
    };

    const playlist = await Playlist.create(playlistData);

    await playlist.populate("createdBy", "name email avatar");

    // Add presigned banner URL
    const playlistWithUrl = await addPresignedBannerUrl(playlist);

    console.log(`🎵 Playlist created: "${name}" by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: { playlist: playlistWithUrl },
    });
  } catch (error) {
    console.error("❌ Create Playlist Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already have a playlist with this name.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create playlist. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get all playlists of logged-in teacher (with pagination, search)
// @route   GET /api/playlists
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getMyPlaylists = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build filter
    const filter = { createdBy: teacherId };

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate("createdBy", "name email avatar")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Playlist.countDocuments(filter),
    ]);

    // Add presigned banner URLs
    const playlistsWithUrls = await addPresignedBannerUrls(playlists);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: "Playlists fetched successfully",
      data: {
        playlists: playlistsWithUrls,
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
    console.error("❌ Get Playlists Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch playlists.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get playlists for students (paginated, searchable)
// @route   GET /api/students/playlists
// @access  Private (Student)
// ─────────────────────────────────────────────
const getPlaylistsForStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build filter (students can see active playlists)
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate("createdBy", "name email avatar")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Playlist.countDocuments(filter),
    ]);

    const playlistIds = playlists.map((p) => p._id);
    const coursesInPlaylists = await Course.find(
      { playlist: { $in: playlistIds }, isActive: true },
      { _id: 1 }
    ).lean();
    const courseIds = coursesInPlaylists.map((c) => c._id);

    const [videoCounts, enrollmentCounts, ratingAgg] = await Promise.all([
      playlistIds.length
        ? Course.aggregate([
            { $match: { playlist: { $in: playlistIds }, isActive: true } },
            { $group: { _id: "$playlist", count: { $sum: 1 } } },
          ])
        : [],
      playlistIds.length
        ? PlaylistEnrollment.aggregate([
            { $match: { playlist: { $in: playlistIds } } },
            { $group: { _id: "$playlist", count: { $sum: 1 } } },
          ])
        : [],
      courseIds.length
        ? CourseRating.aggregate([
            { $match: { course: { $in: courseIds } } },
            {
              $lookup: {
                from: "courses",
                localField: "course",
                foreignField: "_id",
                as: "c",
              },
            },
            { $unwind: "$c" },
            {
              $group: {
                _id: "$c.playlist",
                sum: { $sum: "$rating" },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                averageRating: { $round: [{ $divide: ["$sum", "$count"] }, 1] },
                ratingCount: "$count",
              },
            },
          ])
        : [],
    ]);

    const videoCountMap = {};
    (videoCounts || []).forEach((v) => {
      videoCountMap[v._id.toString()] = v.count;
    });
    const enrollmentCountMap = {};
    (enrollmentCounts || []).forEach((e) => {
      enrollmentCountMap[e._id.toString()] = e.count;
    });
    const ratingMap = {};
    (ratingAgg || []).forEach((r) => {
      ratingMap[r._id.toString()] = {
        averageRating: r.averageRating,
        ratingCount: r.ratingCount,
      };
    });

    const playlistsWithCounts = playlists.map((p) => {
      const id = p._id.toString();
      const rating = ratingMap[id];
      return {
        ...p,
        videoCount: videoCountMap[id] ?? 0,
        enrollmentsCount: enrollmentCountMap[id] ?? 0,
        averageRating: rating ? rating.averageRating : null,
        ratingCount: rating ? rating.ratingCount : 0,
      };
    });

    const playlistsWithUrls = await addPresignedBannerUrls(playlistsWithCounts);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: "Playlists fetched successfully",
      data: {
        playlists: playlistsWithUrls,
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
    console.error("❌ Get Student Playlists Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch playlists.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single playlist by ID for student (with videoCount, enrollmentsCount, isEnrolled)
// @route   GET /api/students/playlists/:playlistId
// @access  Private (Student)
// ─────────────────────────────────────────────
const getPlaylistByIdForStudent = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const studentId = req.user.id;

    const playlist = await Playlist.findOne({
      _id: playlistId,
      isActive: true,
    }).populate("createdBy", "name email avatar");

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    const [videoCount, enrollmentsCount, enrollment] = await Promise.all([
      Course.countDocuments({ playlist: playlistId, isActive: true }),
      PlaylistEnrollment.countDocuments({ playlist: playlistId }),
      PlaylistEnrollment.findOne({ playlist: playlistId, student: studentId }),
    ]);

    const playlistWithUrl = await addPresignedBannerUrl(playlist);
    const payload = {
      ...playlistWithUrl,
      videoCount,
      enrollmentsCount,
      isEnrolled: !!enrollment,
    };

    res.status(200).json({
      success: true,
      data: { playlist: payload },
    });
  } catch (error) {
    console.error("❌ Get Playlist For Student Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch playlist.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single playlist by ID
// @route   GET /api/playlists/:id
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getPlaylistById = async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    }).populate("createdBy", "name email avatar");

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    const playlistWithUrl = await addPresignedBannerUrl(playlist);

    res.status(200).json({
      success: true,
      data: { playlist: playlistWithUrl },
    });
  } catch (error) {
    console.error("❌ Get Playlist Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch playlist.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update playlist
// @route   PUT /api/playlists/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const updatePlaylist = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { name, description, bannerKey } = req.body;

    const playlist = await Playlist.findOne({
      _id: req.params.id,
      createdBy: teacherId,
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found or you don't have permission",
      });
    }

    // Check duplicate name if name is being changed
    if (name && name.toLowerCase() !== playlist.name.toLowerCase()) {
      const duplicate = await Playlist.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
        createdBy: teacherId,
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "You already have another playlist with this name.",
        });
      }
    }

    // Update fields
    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;

    // Update banner if new key provided
    if (bannerKey !== undefined) {
      // Delete old banner from S3 if exists
      if (playlist.banner && playlist.banner.key) {
        await deleteFromS3(playlist.banner.key);
      }

      if (bannerKey) {
        playlist.banner = {
          url: getS3Url(bannerKey),
          key: bannerKey,
        };
      } else {
        playlist.banner = { url: null, key: null };
      }
    }

    await playlist.save();
    await playlist.populate("createdBy", "name email avatar");

    const playlistWithUrl = await addPresignedBannerUrl(playlist);

    console.log(`✏️ Playlist updated: "${playlist.name}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Playlist updated successfully",
      data: { playlist: playlistWithUrl },
    });
  } catch (error) {
    console.error("❌ Update Playlist Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update playlist.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete playlist (also deletes banner from S3)
// @route   DELETE /api/playlists/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const deletePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found or you don't have permission",
      });
    }

    // Delete banner from S3
    if (playlist.banner && playlist.banner.key) {
      await deleteFromS3(playlist.banner.key);
    }

    // Courses only exist inside a playlist, so they go with it — otherwise
    // they linger in the teacher's Course tab with no way for students to
    // reach them, and their S3 files are orphaned.
    const courses = await Course.find({ playlist: playlist._id }).select("_id video thumbnail").lean();
    await Promise.all(
      courses.flatMap((c) => [
        c.video?.key ? deleteFromS3(c.video.key).catch(() => {}) : null,
        c.thumbnail?.key ? deleteFromS3(c.thumbnail.key).catch(() => {}) : null,
      ])
    );
    const courseIds = courses.map((c) => c._id);
    await Promise.all([
      Course.deleteMany({ _id: { $in: courseIds } }),
      CourseRating.deleteMany({ course: { $in: courseIds } }),
      PlaylistEnrollment.deleteMany({ playlist: playlist._id }),
    ]);

    await Playlist.deleteOne({ _id: playlist._id });

    console.log(`🗑️ Playlist deleted: "${playlist.name}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
      data: { playlist },
    });
  } catch (error) {
    console.error("❌ Delete Playlist Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete playlist.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getBannerUploadUrl,
  createPlaylist,
  getMyPlaylists,
  getPlaylistsForStudents,
  getPlaylistByIdForStudent,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
};

