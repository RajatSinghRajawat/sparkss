const Teacher = require("../models/teacher.model");
const Follow = require("../models/follow.model");
const { signStoredUrl } = require("../config/s3");

// ─────────────────────────────────────────────
// @desc    Toggle follow (student follows / unfollows teacher)
// @route   POST /api/students/teachers/:teacherId/follow
// @access  Private (Student)
// ─────────────────────────────────────────────
const toggleFollow = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const studentId = req.user.id;

    const teacher = await Teacher.findById(teacherId).select("_id name");
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const existingFollow = await Follow.findOne({
      teacher: teacherId,
      followedBy: studentId,
    });

    if (existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });
      return res.status(200).json({
        success: true,
        message: "Unfollowed teacher",
        data: {
          following: false,
          teacher: { id: teacher._id, name: teacher.name },
        },
      });
    }

    await Follow.create({
      teacher: teacherId,
      followedBy: studentId,
    });

    res.status(200).json({
      success: true,
      message: "Following teacher",
      data: {
        following: true,
        teacher: { id: teacher._id, name: teacher.name },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Already following this teacher",
      });
    }
    console.error("❌ Toggle Follow Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update follow.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get follow status (is current student following this teacher?)
// @route   GET /api/students/teachers/:teacherId/follow
// @access  Private (Student)
// ─────────────────────────────────────────────
const getFollowStatus = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const studentId = req.user.id;

    const teacher = await Teacher.findById(teacherId).select("_id name");
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const following = await Follow.exists({
      teacher: teacherId,
      followedBy: studentId,
    });

    res.status(200).json({
      success: true,
      data: {
        teacher: { id: teacher._id, name: teacher.name },
        following: !!following,
      },
    });
  } catch (error) {
    console.error("❌ Get Follow Status Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get follow status.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get list of teachers the student is following
// @route   GET /api/students/following
// @access  Private (Student)
// ─────────────────────────────────────────────
const getMyFollowingList = async (req, res) => {
  try {
    const studentId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Follow.find({ followedBy: studentId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("teacher", "name email avatar")
        .lean(),
      Follow.countDocuments({ followedBy: studentId }),
    ]);

    const teachers = (await Promise.all(docs.map(async (d) => {
      const t = d.teacher;
      if (!t) return null;
      return {
        _id: t._id,
        name: t.name,
        email: t.email,
        avatar: await signStoredUrl(t.avatar),
      };
    }))).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        teachers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get My Following List Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch following list.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  toggleFollow,
  getFollowStatus,
  getMyFollowingList,
};
