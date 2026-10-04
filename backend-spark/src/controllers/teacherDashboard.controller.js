const Course = require("../models/course.model");
const Video = require("../models/video.model");
const Test = require("../models/test.model");
const Reel = require("../models/reel.model");
const Category = require("../models/category.model");
const Follow = require("../models/follow.model");

/**
 * @desc    Teacher dashboard overview (stats + recent activity)
 * @route   GET /api/auth/dashboard
 * @access  Private (Teacher)
 *
 * Real data only. When a teacher has no data, counts default to 0 and
 * recentActivity is an empty array — no placeholder/fake values.
 */
const getDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const owner = { createdBy: teacherId };

    // ─── Stats (counts) — run in parallel ───
    const [
      totalStudents,
      coursesCount,
      videosCount,
      testsCount,
      reelsCount,
      categoriesCount,
    ] = await Promise.all([
      Follow.countDocuments({ teacher: teacherId }),
      Course.countDocuments(owner),
      Video.countDocuments(owner),
      Test.countDocuments(owner),
      Reel.countDocuments(owner),
      Category.countDocuments(owner),
    ]);

    // ─── Recent Activity — latest items across resources ───
    const ACTIVITY_LIMIT = 10;
    const pickLatest = (Model, type) =>
      Model.find(owner)
        .select("title createdAt")
        .sort({ createdAt: -1 })
        .limit(ACTIVITY_LIMIT)
        .lean()
        .then((docs) =>
          docs.map((d) => ({
            type,
            id: d._id,
            title: d.title,
            createdAt: d.createdAt,
          }))
        );

    const [courseActs, videoActs, testActs, reelActs] = await Promise.all([
      pickLatest(Course, "course"),
      pickLatest(Video, "video"),
      pickLatest(Test, "test"),
      pickLatest(Reel, "reel"),
    ]);

    const recentActivity = [
      ...courseActs,
      ...videoActs,
      ...testActs,
      ...reelActs,
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, ACTIVITY_LIMIT);

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        stats: {
          totalStudents,
          courses: coursesCount,
          videos: videosCount,
          tests: testsCount,
          reels: reelsCount,
          categories: categoriesCount,
          revenue: 0, // No revenue tracking yet — kept as 0 (no fake data)
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error("❌ getDashboard error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
};

module.exports = { getDashboard };
