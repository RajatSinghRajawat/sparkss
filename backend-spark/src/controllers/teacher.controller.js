const Teacher = require("../models/teacher.model");
const Follow = require("../models/follow.model");
const Reel = require("../models/reel.model");
const ReelView = require("../models/reelView.model");
const Playlist = require("../models/playlist.model");
const Course = require("../models/course.model");
const Video = require("../models/video.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const { getPresignedViewUrl, signStoredUrl } = require("../config/s3");
const { hideLockedVideoUrls } = require("../utils/courseAccess");

// ─── Helper: Add presigned view URLs to a reel object ───
const addPresignedUrlsToReel = async (reel) => {
  const reelObj = reel.toJSON ? reel.toJSON() : { ...reel };
  if (reelObj.video && reelObj.video.key) {
    reelObj.video.url = await getPresignedViewUrl(reelObj.video.key);
  }
  if (reelObj.thumbnail && reelObj.thumbnail.key) {
    reelObj.thumbnail.url = await getPresignedViewUrl(reelObj.thumbnail.key);
  }
  return reelObj;
};

const addPresignedUrlsToReels = async (reels) => {
  return Promise.all(reels.map((reel) => addPresignedUrlsToReel(reel)));
};

// ─── Helper: Add presigned URLs to course (thumbnail + video for list/detail) ───
const addPresignedUrlsToCourse = async (course) => {
  const obj = course.toJSON ? course.toJSON() : { ...course };
  if (obj.thumbnail && obj.thumbnail.key) {
    obj.thumbnail.url = await getPresignedViewUrl(obj.thumbnail.key);
  }
  if (obj.video && obj.video.key) {
    obj.video.url = await getPresignedViewUrl(obj.video.key);
  }
  return obj;
};

const addPresignedUrlsToCourses = async (courses) => {
  return Promise.all(courses.map((c) => addPresignedUrlsToCourse(c)));
};

// ─── Helper: Add presigned URLs to long video ───
const addPresignedUrlsToVideo = async (video) => {
  const obj = video.toJSON ? video.toJSON() : { ...video };
  if (obj.thumbnail && obj.thumbnail.key) {
    obj.thumbnail.url = await getPresignedViewUrl(obj.thumbnail.key);
  }
  if (obj.video && obj.video.key) {
    obj.video.url = await getPresignedViewUrl(obj.video.key);
  }
  return obj;
};

const addPresignedUrlsToVideos = async (videos) => {
  return Promise.all(videos.map((v) => addPresignedUrlsToVideo(v)));
};

// ─────────────────────────────────────────────
// @desc    Get teacher profile by ID (name, email, photo, total courses, enrolled students, followers, reels views, paginated reels)
// @route   GET /api/students/teachers/:teacherId
// @access  Private (Student)
// ─────────────────────────────────────────────
const getTeacherById = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const coursesLimit = Math.min(50, Math.max(1, Number(req.query.coursesLimit) || 20));
    const videosLimit = Math.min(50, Math.max(1, Number(req.query.videosLimit) || 20));

    const teacher = await Teacher.findById(teacherId)
      .select("name email avatar")
      .lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const [teacherPlaylists, teacherReels] = await Promise.all([
      Playlist.find({ createdBy: teacherId }).select("_id").lean(),
      Reel.find({ createdBy: teacherId, isActive: true }).select("_id").lean(),
    ]);
    const playlistIds = teacherPlaylists.map((p) => p._id);
    const reelIds = teacherReels.map((r) => r._id);

    const [
      followersCount,
      totalCourses,
      totalEnrolledStudents,
      totalReelsViews,
      reels,
      totalReels,
      coursesRaw,
      videosRaw,
    ] = await Promise.all([
      Follow.countDocuments({ teacher: teacherId }),
      Course.countDocuments({ createdBy: teacherId, isActive: true }),
      playlistIds.length
        ? PlaylistEnrollment.countDocuments({ playlist: { $in: playlistIds } })
        : 0,
      reelIds.length
        ? ReelView.countDocuments({ reel: { $in: reelIds } })
        : 0,
      Reel.find({ createdBy: teacherId, isActive: true })
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Reel.countDocuments({ createdBy: teacherId, isActive: true }),
      Course.find({ createdBy: teacherId, isActive: true })
        .populate("playlist", "name")
        .sort({ createdAt: -1 })
        .limit(coursesLimit)
        .lean(),
      Video.find({ createdBy: teacherId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(videosLimit)
        .lean(),
    ]);

    const [reelsWithUrls, coursesWithUrls, videosWithUrls] = await Promise.all([
      addPresignedUrlsToReels(reels),
      addPresignedUrlsToCourses(coursesRaw),
      addPresignedUrlsToVideos(videosRaw),
    ]);

    const totalPages = Math.ceil(totalReels / limit);

    const teacherResponse = {
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email || null,
      avatar: await signStoredUrl(teacher.avatar),
      totalCourses,
      totalEnrolledStudents,
      totalFollowers: followersCount,
      totalReelsViews,
      followersCount,
    };

    res.status(200).json({
      success: true,
      message: "Teacher profile fetched successfully",
      data: {
        teacher: teacherResponse,
        reels: reelsWithUrls,
        pagination: {
          page,
          limit,
          total: totalReels,
          totalPages,
          hasMore: page < totalPages,
        },
        courses: req.user?.id ? await hideLockedVideoUrls(coursesWithUrls, req.user.id) : coursesWithUrls,
        videos: videosWithUrls,
      },
    });
  } catch (error) {
    console.error("❌ Get Teacher By ID Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher profile.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getTeacherById,
};
