/**
 * Dashboard teacher test list – admin only.
 * GET /api/admin/dashboard/tests?page=1&limit=10&search=...&tab=new|complete
 * tab: new = endTime > now (upcoming/live), complete = endTime < now
 */

const Test = require("../models/test.model");
const { escapeRegex } = require("../utils/escapeRegex");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Get all tests with pagination, search, tab (new | complete)
// @route   GET /api/admin/dashboard/tests
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTestList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const search = (req.query.search || "").trim();
    const tab = req.query.tab === "complete" ? "complete" : "new";

    const now = new Date();

    const filter = { isActive: true };

    if (tab === "new") {
      filter.$or = [
        { endTime: { $gt: now } },
        { endTime: null, startTime: { $gt: now } },
      ];
    } else {
      filter.endTime = { $lt: now };
    }

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: escapeRegex(search), $options: "i" } },
          { description: { $regex: escapeRegex(search), $options: "i" } },
        ],
      });
    }

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      Test.countDocuments(filter),
    ]);

    const list = tests.map((t) => ({
      _id: t._id.toString(),
      title: t.title || "",
      description: t.description || "",
      startTime: t.startTime,
      endTime: t.endTime,
      teacherName: t.createdBy ? (t.createdBy.name ?? "—") : "Admin",
      teacherEmail: t.createdBy ? (t.createdBy.email ?? "—") : "—",
      questionCount: (t.questions || []).length,
    }));

    res.status(200).json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("❌ Dashboard getTestList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load test list.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getTestList };
