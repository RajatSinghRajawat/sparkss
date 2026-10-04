const Test = require("../models/test.model");
const { generateUploadUrl, deleteFromS3 } = require("../helpers/fileHelper");
const { getS3Url, getPresignedViewUrl } = require("../config/s3");
const { escapeRegex } = require("../utils/escapeRegex");

const parseAndLogStartTime = (startTime, label, meta = {}) => {
  const parsedStartTime = new Date(startTime);
  console.log(`[${label}] startTime trace`, {
    ...meta,
    rawStartTime: startTime,
    parsedStartTime: parsedStartTime.toString(),
    parsedStartTimeISO: Number.isNaN(parsedStartTime.getTime())
      ? "Invalid Date"
      : parsedStartTime.toISOString(),
    serverTimezoneOffsetMinutes: parsedStartTime.getTimezoneOffset?.(),
  });
  return parsedStartTime;
};

const addPresignedBannerUrl = async (test) => {
  const obj = test.toJSON ? test.toJSON() : { ...test };
  if (obj.banner && obj.banner.key) {
    obj.banner.url = await getPresignedViewUrl(obj.banner.key);
  }
  return obj;
};

const addPresignedBannerUrlsToTests = async (tests) => {
  return Promise.all(tests.map((t) => addPresignedBannerUrl(t)));
};

// POST /api/tests/upload-url
const getBannerUploadUrl = async (req, res) => {
  try {
    const { bannerType } = req.body;
    if (!bannerType) {
      return res.status(400).json({
        success: false,
        message: "bannerType (MIME type) is required. e.g. image/jpeg",
      });
    }
    const bannerData = await generateUploadUrl("tests/banners", bannerType);
    console.log("Test banner upload URL generated for: " + req.user.name);
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
    console.error("Get Test Banner Upload URL Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URL.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// POST /api/tests
const createTest = async (req, res) => {
  try {
    const teacherId = req.user.id;
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

    const parsedStartTime = parseAndLogStartTime(startTime, "createTest", {
      teacherId,
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
      createdBy: teacherId,
    };

    const test = await Test.create(testData);
    await test.populate("createdBy", "name email");
    const testWithUrl = await addPresignedBannerUrl(test);

    console.log("Test created: " + test.title + " by " + req.user.name, {
      storedStartTime: test.startTime?.toString?.(),
      storedStartTimeISO: test.startTime?.toISOString?.(),
      storedEndTimeISO: test.endTime?.toISOString?.() || null,
    });
    res.status(201).json({
      success: true,
      message: "Test created successfully",
      data: { test: testWithUrl },
    });
  } catch (error) {
    console.error("Create Test Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create test.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// GET /api/tests
const getMyTests = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = { createdBy: teacherId };
    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .populate("createdBy", "name email")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Test.countDocuments(filter),
    ]);

    const testsWithUrls = await addPresignedBannerUrlsToTests(tests);
    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: "Tests fetched successfully",
      data: {
        tests: testsWithUrls,
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
    console.error("Get Tests Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tests.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// GET /api/tests/:id
const getTestById = async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    }).populate("createdBy", "name email");

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const testWithUrl = await addPresignedBannerUrl(test);
    res.status(200).json({
      success: true,
      message: "Test fetched successfully",
      data: { test: testWithUrl },
    });
  } catch (error) {
    console.error("Get Test By ID Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch test.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// PUT /api/tests/:id
const updateTest = async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const {
      title,
      description,
      bannerKey,
      startTime,
      perQuestionMinutes,
      perQuestionSeconds,
      questions,
    } = req.body;

    if (title !== undefined) test.title = title.trim();
    if (description !== undefined) test.description = description || "";
    if (startTime !== undefined) {
      const parsedStartTime = parseAndLogStartTime(startTime, "updateTest", {
        testId: test._id.toString(),
        title: title?.trim?.() || test.title,
      });
      if (Number.isNaN(parsedStartTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid startTime value",
        });
      }
      test.startTime = parsedStartTime;
    }
    if (perQuestionMinutes !== undefined) test.perQuestionMinutes = Number(perQuestionMinutes) || 0;
    if (perQuestionSeconds !== undefined) test.perQuestionSeconds = Number(perQuestionSeconds) || 0;
    if (Array.isArray(questions)) test.questions = questions;

    if (bannerKey !== undefined) {
      if (test.banner && test.banner.key) await deleteFromS3(test.banner.key);
      test.banner = bannerKey
        ? { url: getS3Url(bannerKey), key: bannerKey }
        : { url: null, key: null };
    }

    await test.save();
    await test.populate("createdBy", "name email");
    const testWithUrl = await addPresignedBannerUrl(test);

    console.log("Test updated: " + test.title, {
      testId: test._id.toString(),
      storedStartTime: test.startTime?.toString?.(),
      storedStartTimeISO: test.startTime?.toISOString?.(),
      storedEndTimeISO: test.endTime?.toISOString?.() || null,
    });
    res.status(200).json({
      success: true,
      message: "Test updated successfully",
      data: { test: testWithUrl },
    });

    // Notify subscribers that the test was edited (fire-and-forget)
    const { notifyTestSubscribers } = require("../services/notification.service");
    notifyTestSubscribers(test._id, {
      title: "Test updated",
      body: `"${test.title}" has been updated. Tap to view the latest details.`,
      data: { event: "test_edited" },
    }).catch(() => {});
  } catch (error) {
    console.error("Update Test Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update test.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// DELETE /api/tests/:id
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (test.banner && test.banner.key) await deleteFromS3(test.banner.key);
    await Test.findByIdAndDelete(test._id);

    console.log("Test deleted: " + test.title);
    res.status(200).json({
      success: true,
      message: "Test deleted successfully",
      data: { test: { _id: test._id } },
    });
  } catch (error) {
    console.error("Delete Test Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete test.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── Teacher: Send a custom announcement to a test's notification subscribers ───
// POST /api/tests/:id/announce  { message }
const announceToTestSubscribers = async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    })
      .select("_id title")
      .lean();

    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const message = (req.body.message || "").trim();
    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Announcement message is required" });
    }

    const { notifyTestSubscribers } = require("../services/notification.service");
    const result = await notifyTestSubscribers(test._id, {
      title: test.title,
      body: message,
      data: { event: "teacher_announcement" },
    });

    return res.status(200).json({
      success: true,
      message: "Announcement sent to subscribers",
      data: { testId: test._id, ...result },
    });
  } catch (error) {
    console.error("Announce Test Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send announcement.",
    });
  }
};

// ─── Student: Get single test by ID (for play screen) ───
// GET /api/students/tests/:id
const getTestByIdForStudent = async (req, res) => {
  try {
    // Never send answers to students — the quiz is graded server-side.
    const test = await Test.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .select("-questions.correctAnswer")
      .populate("createdBy", "name")
      .lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const [testWithUrl] = await addPresignedBannerUrlsToTests([test]);
    res.status(200).json({
      success: true,
      message: "Test fetched successfully",
      data: { test: testWithUrl },
    });
  } catch (error) {
    console.error("Get Test By ID (Student) Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch test.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── Student: Get test list (today | completed | my_completed), paginated ───
// GET /api/students/tests?type=today|completed|my_completed&page=1&limit=10
// my_completed = tests this student has attempted (has Result with completedAt)
const getStudentTestList = async (req, res) => {
  try {
    const { type = "today", page = 1, limit = 10 } = req.query;
    const now = new Date();
    const studentId = req.user.id;

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const Result = require("../models/result.model");
    let filter = { isActive: true };

    if (type === "my_completed") {
      // Include tests where student attempted at least one question (full complete or left in between)
      const attemptedTestIds = await Result.find({
        student: studentId,
        "answers.0": { $exists: true },
      })
        .distinct("test")
        .lean();
      filter._id = { $in: attemptedTestIds };
    } else if (type === "completed") {
      filter.endTime = { $lt: now };
    } else if (type === "today") {
      filter.startTime = { $gte: startOfToday, $lte: endOfToday };
    } else {
      return res.status(400).json({
        success: false,
        message: "Query 'type' must be 'today', 'completed' or 'my_completed'",
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = type === "today" ? { startTime: 1 } : { endTime: -1 };

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .select("-questions.correctAnswer")
        .populate("createdBy", "name")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Test.countDocuments(filter),
    ]);

    const testsWithUrls = await addPresignedBannerUrlsToTests(tests);
    const totalPages = Math.ceil(total / Number(limit));

    // Mark which tests this student has subscribed to notifications for (bell ON)
    const TestNotificationSubscription = require("../models/testNotificationSubscription.model");
    const subscribedTestIds = await TestNotificationSubscription.find({
      student: studentId,
      test: { $in: tests.map((t) => t._id) },
    })
      .distinct("test")
      .lean();
    const subscribedSet = new Set(subscribedTestIds.map(String));
    testsWithUrls.forEach((t) => {
      t.isNotifySubscribed = subscribedSet.has(String(t._id));
    });

    const completedResults = await Result.find({
      student: studentId,
      "answers.0": { $exists: true },
    })
      .select("answers")
      .lean();
    let averageScore = 0;
    if (completedResults.length > 0) {
      const sum = completedResults.reduce((acc, r) => {
        const n = r.answers.length;
        if (n === 0) return acc;
        const correct = r.answers.filter((a) => a.isCorrect).length;
        return acc + (correct / n) * 100;
      }, 0);
      averageScore = Math.round(sum / completedResults.length);
    }

    res.status(200).json({
      success: true,
      message: "Tests fetched successfully",
      data: {
        tests: testsWithUrls,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          hasMore: Number(page) < totalPages,
        },
        averageScore,
      },
    });
  } catch (error) {
    console.error("Get Student Test List Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tests.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getBannerUploadUrl,
  createTest,
  getMyTests,
  getTestById,
  updateTest,
  deleteTest,
  announceToTestSubscribers,
  getStudentTestList,
  getTestByIdForStudent,
};
