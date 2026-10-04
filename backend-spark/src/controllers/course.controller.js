const Course = require("../models/course.model");
const Playlist = require("../models/playlist.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const CourseRating = require("../models/courseRating.model");
const { generateUploadUrl, deleteFromS3 } = require("../helpers/fileHelper");
const { getS3Url, getPresignedViewUrl } = require("../config/s3");
const { escapeRegex } = require("../utils/escapeRegex");
const { hideLockedVideoUrls } = require("../utils/courseAccess");

// ─── Helper: Add presigned view URLs to a course ───
const addPresignedUrls = async (course) => {
  const obj = course.toJSON ? course.toJSON() : { ...course };

  if (obj.video && obj.video.key) {
    obj.video.url = await getPresignedViewUrl(obj.video.key);
  }
  if (obj.thumbnail && obj.thumbnail.key) {
    obj.thumbnail.url = await getPresignedViewUrl(obj.thumbnail.key);
  }

  return obj;
};

// ─── Helper: Add presigned URLs to array of courses ───
const addPresignedUrlsToCourses = async (courses) => {
  return Promise.all(courses.map((c) => addPresignedUrls(c)));
};

// ─────────────────────────────────────────────
// @desc    Get presigned upload URLs for course video & thumbnail
// @route   POST /api/courses/upload-url
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

    const videoData = await generateUploadUrl("courses/videos", videoType);

    let thumbnailData = null;
    if (thumbnailType) {
      thumbnailData = await generateUploadUrl("courses/thumbnails", thumbnailType);
    }

    console.log(`🔗 Course upload URLs generated for teacher: ${req.user.name}`);

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
    console.error("❌ Get Course Upload URLs Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URLs.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create course (after client uploads video/thumbnail to S3)
// @route   POST /api/courses
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      playlist,
      title,
      description,
      duration,
      videoKey,
      thumbnailKey,
    } = req.body;


    if (!videoKey) {
      return res.status(400).json({
        success: false,
        message: "videoKey is required. Upload the video first using the presigned URL.",
      });
    }

    // Verify playlist exists and belongs to this teacher
    const playlistDoc = await Playlist.findOne({
      _id: playlist,
      createdBy: teacherId,
    });

    if (!playlistDoc) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found or doesn't belong to you.",
      });
    }

    const videoUrl = getS3Url(videoKey);
    const thumbnailUrl = thumbnailKey ? getS3Url(thumbnailKey) : null;

    const courseData = {
      playlist,
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
      duration: duration ? Number(duration) : 0,
      createdBy: teacherId,
    };

    const course = await Course.create(courseData);

    await course.populate([
      { path: "playlist", select: "name" },
      { path: "createdBy", select: "name email" },
    ]);

    const courseWithUrls = await addPresignedUrls(course);

    console.log(`📚 Course created: "${title}" by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: { course: courseWithUrls },
    });
  } catch (error) {
    console.error("❌ Create Course Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create course. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get all courses of logged-in teacher (with pagination, search, playlist filter)
// @route   GET /api/courses
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getMyCourses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      page = 1,
      limit = 10,
      playlist,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = { createdBy: teacherId };

    if (playlist) {
      filter.playlist = playlist;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("playlist", "name")
        .populate("createdBy", "name email")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Course.countDocuments(filter),
    ]);

    const coursesWithUrls = await addPresignedUrlsToCourses(courses);
    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      data: {
        courses: coursesWithUrls,
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
    console.error("❌ Get Courses Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get courses (videos) by playlist ID for student
// @route   GET /api/students/playlists/:playlistId/courses
// @access  Private (Student)
// ─────────────────────────────────────────────
const getCoursesByPlaylistForStudent = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const studentId = req.user.id;

    const playlist = await Playlist.findOne({
      _id: playlistId,
      isActive: true,
    });
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    const courses = await Course.find({
      playlist: playlistId,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .populate("playlist", "name")
      .populate("createdBy", "name email")
      .lean();

    const courseIds = courses.map((c) => c._id);
    const ratings = await CourseRating.find({
      course: { $in: courseIds },
      student: studentId,
    }).lean();

    const ratingByCourse = {};
    ratings.forEach((r) => {
      ratingByCourse[r.course.toString()] = r.rating;
    });

    const coursesWithUrls = await hideLockedVideoUrls(
      await addPresignedUrlsToCourses(courses),
      studentId
    );
    const coursesWithMyRating = coursesWithUrls.map((c) => ({
      ...c,
      myRating: ratingByCourse[c._id.toString()] ?? null,
    }));

    res.status(200).json({
      success: true,
      data: { courses: coursesWithMyRating },
    });
  } catch (error) {
    console.error("❌ Get Courses By Playlist For Student Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single course by ID for student (for playback)
// @route   GET /api/students/courses/:courseId
// @access  Private (Student)
// ─────────────────────────────────────────────
const getCourseByIdForStudent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const course = await Course.findOne({
      _id: courseId,
      isActive: true,
    })
      .populate("playlist", "name")
      .populate("createdBy", "name email");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const playlistId = course.playlist?._id ?? course.playlist;
    const enrolled = await PlaylistEnrollment.findOne({
      playlist: playlistId,
      student: studentId,
    });
    if (!enrolled) {
      return res.status(403).json({
        success: false,
        message: "Enroll in the playlist to watch this video",
      });
    }

    const courseWithUrls = await addPresignedUrls(course);

    res.status(200).json({
      success: true,
      data: { course: courseWithUrls },
    });
  } catch (error) {
    console.error("❌ Get Course For Student Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    })
      .populate("playlist", "name")
      .populate("createdBy", "name email");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const courseWithUrls = await addPresignedUrls(course);

    res.status(200).json({
      success: true,
      data: { course: courseWithUrls },
    });
  } catch (error) {
    console.error("❌ Get Course Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const updateCourse = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, description, duration, videoKey, thumbnailKey, playlist } = req.body;

    const course = await Course.findOne({
      _id: req.params.id,
      createdBy: teacherId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you don't have permission",
      });
    }

    if (playlist) {
      const playlistDoc = await Playlist.findOne({
        _id: playlist,
        createdBy: teacherId,
      });
      if (!playlistDoc) {
        return res.status(404).json({
          success: false,
          message: "Playlist not found or doesn't belong to you.",
        });
      }
      course.playlist = playlist;
    }

    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (duration !== undefined) course.duration = Number(duration);

    // Replace video if new key provided
    if (videoKey) {
      if (course.video && course.video.key) {
        await deleteFromS3(course.video.key);
      }
      course.video = {
        url: getS3Url(videoKey),
        key: videoKey,
      };
    }

    // Replace thumbnail if new key provided
    if (thumbnailKey !== undefined) {
      if (course.thumbnail && course.thumbnail.key) {
        await deleteFromS3(course.thumbnail.key);
      }
      course.thumbnail = thumbnailKey
        ? { url: getS3Url(thumbnailKey), key: thumbnailKey }
        : { url: null, key: null };
    }

    await course.save();

    await course.populate([
      { path: "playlist", select: "name" },
      { path: "createdBy", select: "name email" },
    ]);

    const courseWithUrls = await addPresignedUrls(course);

    console.log(`✏️ Course updated: "${course.title}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: { course: courseWithUrls },
    });
  } catch (error) {
    console.error("❌ Update Course Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update course.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete course (also deletes video & thumbnail from S3)
// @route   DELETE /api/courses/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you don't have permission",
      });
    }

    if (course.video && course.video.key) {
      await deleteFromS3(course.video.key);
    }
    if (course.thumbnail && course.thumbnail.key) {
      await deleteFromS3(course.thumbnail.key);
    }

    await Course.deleteOne({ _id: course._id });

    console.log(`🗑️ Course deleted: "${course.title}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
      data: { course },
    });
  } catch (error) {
    console.error("❌ Delete Course Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete course.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getUploadUrls,
  createCourse,
  getMyCourses,
  getCoursesByPlaylistForStudent,
  getCourseByIdForStudent,
  getCourseById,
  updateCourse,
  deleteCourse,
};
