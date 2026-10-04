/**
 * Dashboard chart data – reels views & course enrolled by time range.
 * GET /api/admin/dashboard/charts?range=1d|1w|1m|1y
 */

const ReelView = require("../models/reelView.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");

const VALID_RANGES = ["1d", "1w", "1m", "1y"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getRangeBounds(range) {
  const now = new Date();
  const end = new Date(now);
  let start;

  switch (range) {
    case "1d": {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      end.setTime(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      break;
    }
    case "1w": {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "1m": {
      start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "1y": {
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    }
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function fillReelsViews1d(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.views]));
  return Array.from({ length: 24 }, (_, i) => ({
    label: `${i}:00`,
    views: map.get(i) ?? 0,
    enrolled: 0,
  }));
}

function fillReelsViews1w(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.views]));
  return DAY_LABELS.map((label, i) => {
    const dayId = i === 6 ? 1 : i + 2;
    return { label, views: map.get(dayId) ?? 0, enrolled: 0 };
  });
}

function fillReelsViews1m(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.views]));
  const out = [];
  const now = new Date();
  for (let d = 29; d >= 0; d--) {
    const dte = new Date(now);
    dte.setDate(dte.getDate() - d);
    const key = dte.toISOString().slice(0, 10);
    out.push({ label: String(30 - d), views: map.get(key) ?? 0, enrolled: 0 });
  }
  return out;
}

function fillReelsViews1y(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.views]));
  return MONTH_LABELS.map((label, i) => ({
    label,
    views: map.get(i + 1) ?? 0,
    enrolled: 0,
  }));
}

function fillEnrolled1d(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.enrolled]));
  return Array.from({ length: 24 }, (_, i) => ({
    label: `${i}:00`,
    views: 0,
    enrolled: map.get(i) ?? 0,
  }));
}

function fillEnrolled1w(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.enrolled]));
  return DAY_LABELS.map((label, i) => {
    const dayId = i === 6 ? 1 : i + 2;
    return { label, views: 0, enrolled: map.get(dayId) ?? 0 };
  });
}

function fillEnrolled1m(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.enrolled]));
  const out = [];
  const now = new Date();
  for (let d = 29; d >= 0; d--) {
    const dte = new Date(now);
    dte.setDate(dte.getDate() - d);
    const key = dte.toISOString().slice(0, 10);
    out.push({ label: String(30 - d), views: 0, enrolled: map.get(key) ?? 0 });
  }
  return out;
}

function fillEnrolled1y(buckets) {
  const map = new Map(buckets.map((b) => [b._id, b.enrolled]));
  return MONTH_LABELS.map((label, i) => ({
    label,
    views: 0,
    enrolled: map.get(i + 1) ?? 0,
  }));
}

/**
 * GET /api/admin/dashboard/charts?range=1d|1w|1m|1y
 */
const getChartData = async (req, res) => {
  try {
    const range = (req.query.range || "1w").toLowerCase();
    if (!VALID_RANGES.includes(range)) {
      return res.status(400).json({
        success: false,
        message: "Invalid range. Use 1d, 1w, 1m, or 1y.",
      });
    }

    const { start, end } = getRangeBounds(range);
    const matchStage = { createdAt: { $gte: start, $lte: end } };

    let reelsViewsAggregate;
    let enrolledAggregate;

    if (range === "1d") {
      reelsViewsAggregate = ReelView.aggregate([
        { $match: matchStage },
        { $group: { _id: { $hour: "$createdAt" }, views: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      enrolledAggregate = PlaylistEnrollment.aggregate([
        { $match: matchStage },
        { $group: { _id: { $hour: "$createdAt" }, enrolled: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
    } else if (range === "1w") {
      reelsViewsAggregate = ReelView.aggregate([
        { $match: matchStage },
        { $group: { _id: { $dayOfWeek: "$createdAt" }, views: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      enrolledAggregate = PlaylistEnrollment.aggregate([
        { $match: matchStage },
        { $group: { _id: { $dayOfWeek: "$createdAt" }, enrolled: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
    } else if (range === "1m") {
      reelsViewsAggregate = ReelView.aggregate([
        { $match: matchStage },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, views: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      enrolledAggregate = PlaylistEnrollment.aggregate([
        { $match: matchStage },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, enrolled: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
    } else {
      reelsViewsAggregate = ReelView.aggregate([
        { $match: matchStage },
        { $group: { _id: { $month: "$createdAt" }, views: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      enrolledAggregate = PlaylistEnrollment.aggregate([
        { $match: matchStage },
        { $group: { _id: { $month: "$createdAt" }, enrolled: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
    }

    const [reelsBuckets, enrolledBuckets] = await Promise.all([
      reelsViewsAggregate,
      enrolledAggregate,
    ]);

    let reelsViews;
    let courseEnrolled;
    if (range === "1d") {
      reelsViews = fillReelsViews1d(reelsBuckets);
      courseEnrolled = fillEnrolled1d(enrolledBuckets);
    } else if (range === "1w") {
      reelsViews = fillReelsViews1w(reelsBuckets);
      courseEnrolled = fillEnrolled1w(enrolledBuckets);
    } else if (range === "1m") {
      reelsViews = fillReelsViews1m(reelsBuckets);
      courseEnrolled = fillEnrolled1m(enrolledBuckets);
    } else {
      reelsViews = fillReelsViews1y(reelsBuckets);
      courseEnrolled = fillEnrolled1y(enrolledBuckets);
    }

    res.status(200).json({
      success: true,
      data: {
        reelsViews,
        courseEnrolled,
      },
    });
  } catch (error) {
    console.error("❌ Dashboard getChartData Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load chart data.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getChartData };
