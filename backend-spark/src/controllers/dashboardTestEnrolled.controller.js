/**
 * Dashboard: enrolled users (results) for a completed test – admin only.
 * GET /api/admin/dashboard/tests/:testId/enrolled-users
 * Returns students who attempted the test with score and answers.
 */

const Test = require("../models/test.model");
const Result = require("../models/result.model");
const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// @desc    Get enrolled users (results) for a test with score and answers
// @route   GET /api/admin/dashboard/tests/:testId/enrolled-users
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTestEnrolledUsers = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId || !mongoose.isValidObjectId(testId)) {
      return res.status(400).json({ success: false, message: "Valid test ID is required." });
    }

    const test = await Test.findById(testId)
      .select("title questions startTime endTime")
      .lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found." });
    }

    const results = await Result.find({ test: testId })
      .populate("student", "name email")
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    const questions = (test.questions || []).map((q, idx) => ({
      index: idx,
      questionText: q.questionText || "",
      options: q.options || [],
      correctAnswer: q.correctAnswer,
    }));

    const enrollees = results.map((r) => {
      const totalQuestions = questions.length;
      const answersWithDetail = (r.answers || []).map((a) => {
        const q = questions[a.questionNumber];
        return {
          questionNumber: a.questionNumber,
          questionText: q?.questionText ?? "",
          options: q?.options ?? [],
          userSelectedOption: a.userSelectedOption,
          correctOption: a.correctOption,
          isCorrect: a.isCorrect,
        };
      });
      const correctCount = (r.answers || []).filter((a) => a.isCorrect).length;
      return {
        _id: r._id.toString(),
        studentId: r.student?._id?.toString(),
        studentName: r.student?.name ?? "—",
        studentEmail: r.student?.email ?? "—",
        score: correctCount,
        totalQuestions,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        answers: answersWithDetail,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        test: {
          _id: test._id.toString(),
          title: test.title,
          startTime: test.startTime,
          endTime: test.endTime,
          questionCount: questions.length,
        },
        enrollees,
      },
    });
  } catch (error) {
    console.error("❌ getTestEnrolledUsers Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load enrolled users.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getTestEnrolledUsers };
