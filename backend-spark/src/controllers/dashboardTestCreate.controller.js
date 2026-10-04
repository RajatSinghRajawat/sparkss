/**
 * Dashboard: admin create test.
 * POST /api/admin/dashboard/tests
 * Body: title, description?, bannerKey?, startTime, perQuestionMinutes?, perQuestionSeconds?, questions?
 * createdBy is set to null (admin-created).
 */

const Test = require("../models/test.model");
const { getS3Url } = require("../config/s3");

const parseAndLogStartTime = (startTime, label, meta = {}) => {
  const parsedStartTime = new Date(startTime);
  console.log(`[${label}] startTime trace`, {
    ...meta,
    rawStartTime: startTime,
    parsedStartTime: parsedStartTime.toString(),
    parsedStartTimeISO: Number.isNaN(parsedStartTime.getTime())
      ? "Invalid Date"
      : parsedStartTime.toISOString(),
    serverTimezoneOffsetMinutes: parsedStartTime.getTimezoneOffset(),
  });
  return parsedStartTime;
};

// ─────────────────────────────────────────────
// @desc    Create test (admin only; createdBy = null)
// @route   POST /api/admin/dashboard/tests
// @access  Private (Admin)
// ─────────────────────────────────────────────
const createTest = async (req, res) => {
  try {
    const {
      title,
      description,
      bannerKey,
      startTime,
      perQuestionMinutes,
      perQuestionSeconds,
      questions,
    } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({
        success: false,
        message: "title and startTime are required",
      });
    }

    const parsedStartTime = parseAndLogStartTime(startTime, "adminCreateTest", {
      title: title?.trim?.(),
    });
    if (Number.isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime value",
      });
    }

    const testData = {
      title: title.trim(),
      description: description || "",
      banner: bannerKey
        ? { url: getS3Url(bannerKey), key: bannerKey }
        : { url: null, key: null },
      startTime: parsedStartTime,
      perQuestionMinutes: Number(perQuestionMinutes) || 0,
      perQuestionSeconds: Number(perQuestionSeconds) || 0,
      questions: Array.isArray(questions) ? questions : [],
      createdBy: null,
    };

    const test = await Test.create(testData);

    console.log("Test created by admin: " + test.title, {
      storedStartTime: test.startTime?.toString?.(),
      storedStartTimeISO: test.startTime?.toISOString?.(),
      storedEndTimeISO: test.endTime?.toISOString?.() || null,
    });
    res.status(201).json({
      success: true,
      message: "Test created successfully",
      data: {
        test: {
          _id: test._id.toString(),
          title: test.title,
          description: test.description,
          startTime: test.startTime,
          endTime: test.endTime,
          perQuestionMinutes: test.perQuestionMinutes,
          perQuestionSeconds: test.perQuestionSeconds,
          questionCount: (test.questions || []).length,
        },
      },
    });
  } catch (error) {
    console.error("Admin create test error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create test.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { createTest };
