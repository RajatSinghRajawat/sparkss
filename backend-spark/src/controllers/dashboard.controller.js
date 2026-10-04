/**
 * Dashboard controller – admin dashboard stats (counts).
 * All counts from DB; todayTestCount = tests with startTime on current day (UTC).
 */

const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const Test = require("../models/test.model");
const Course = require("../models/course.model");
const Video = require("../models/video.model");
const Reel = require("../models/reel.model");
const HelpConversation = require("../models/helpConversation.model");
const TeacherSupportConversation = require("../models/teacherSupportConversation.model");

/**
 * Get start and end of today in UTC (for today's test count).
 */
function getTodayStartEndUTC() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

// ─────────────────────────────────────────────
// @desc    Get dashboard card counts (admin only)
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const { start: todayStart, end: todayEnd } = getTodayStartEndUTC();

    const [
      totalTests,
      totalStudents,
      totalTeachers,
      totalCourses,
      totalVideos,
      totalReels,
      todayTestCount,
      studentSupportChatCount,
      teacherSupportChatCount,
    ] = await Promise.all([
      Test.countDocuments(),
      Student.countDocuments(),
      Teacher.countDocuments(),
      Course.countDocuments(),
      Video.countDocuments(),
      Reel.countDocuments(),
      Test.countDocuments({ startTime: { $gte: todayStart, $lte: todayEnd } }),
      HelpConversation.countDocuments(),
      TeacherSupportConversation.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTests,
        totalStudents,
        totalTeachers,
        totalCourses,
        totalVideos,
        totalReels,
        todayTestCount,
        studentSupportChatCount,
        teacherSupportChatCount,
      },
    });
  } catch (error) {
    console.error("❌ Dashboard getStats Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getStats };
