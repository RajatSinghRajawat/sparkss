/**
 * Dashboard today's test list – admin only.
 * GET /api/admin/dashboard/today-tests
 */

const Test = require("../models/test.model");

function getTodayStartEndUTC() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatus(now, startTime, endTime) {
  const s = new Date(startTime).getTime();
  const e = new Date(endTime).getTime();
  const n = now.getTime();
  if (n < s) return "scheduled";
  if (n >= s && n <= e) return "live";
  return "completed";
}

function formatDuration(startTime, endTime) {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : start;
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m} min` : `${h}h`;
}

// ─────────────────────────────────────────────
// @desc    Get today's tests list (admin only)
// @route   GET /api/admin/dashboard/today-tests
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTodayTests = async (req, res) => {
  try {
    const { start, end } = getTodayStartEndUTC();
    const now = new Date();

    const tests = await Test.find({
      startTime: { $gte: start, $lte: end },
      isActive: true,
    })
      .sort({ startTime: 1 })
      .select("title startTime endTime perQuestionMinutes perQuestionSeconds questions createdBy")
      .populate("createdBy", "name")
      .lean();

    const list = tests.map((t) => ({
      _id: t._id.toString(),
      testName: t.title || "",
      teacher: t.createdBy?.name ? String(t.createdBy.name) : "—",
      time: formatTime(t.startTime),
      duration: formatDuration(t.startTime, t.endTime),
      status: getStatus(now, t.startTime, t.endTime || t.startTime),
    }));

    res.status(200).json({
      success: true,
      data: { tests: list },
    });
  } catch (error) {
    console.error("❌ Dashboard getTodayTests Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load today's tests.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getTodayTests };
