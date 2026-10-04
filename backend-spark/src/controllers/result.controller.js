const Result = require("../models/result.model");
const Test = require("../models/test.model");

/**
 * POST /api/students/tests/:testId/answer
 * Body: { questionNumber: number (0-based), selectedOption: number (0-based) }
 * Find or create Result for this student+test, append answer with correctOption from Test, set isCorrect.
 */
const submitAnswer = async (req, res) => {
  try {
    const studentId = req.user.id;
    const testId = req.params.testId;
    const questionNumber = Number(req.body.questionNumber);
    const selectedOption = Number(req.body.selectedOption);

    if (Number.isNaN(questionNumber) || questionNumber < 0) {
      return res.status(400).json({
        success: false,
        message: "questionNumber must be a non-negative number",
      });
    }
    if (Number.isNaN(selectedOption) || selectedOption < 0) {
      return res.status(400).json({
        success: false,
        message: "selectedOption must be a non-negative number",
      });
    }

    const test = await Test.findById(testId).lean();
    if (!test || !test.isActive) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const questions = test.questions || [];
    if (questionNumber >= questions.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid question number",
      });
    }

    const question = questions[questionNumber];
    const correctOption = question.correctAnswer;
    const optionsCount = (question.options || []).length;
    if (selectedOption >= optionsCount) {
      return res.status(400).json({
        success: false,
        message: "Invalid selected option",
      });
    }

    const isCorrect = selectedOption === correctOption;

    let result = await Result.findOne({ student: studentId, test: testId });
    if (!result) {
      result = await Result.create({
        student: studentId,
        test: testId,
        answers: [],
      });
    }

    const alreadyAnswered = result.answers.some(
      (a) => a.questionNumber === questionNumber
    );
    if (alreadyAnswered) {
      return res.status(400).json({
        success: false,
        message: "Already answered this question",
      });
    }

    result.answers.push({
      questionNumber,
      userSelectedOption: selectedOption,
      correctOption,
      isCorrect,
    });
    await result.save();

    res.status(200).json({
      success: true,
      message: "Answer saved",
      data: {
        questionNumber,
        isCorrect,
        totalQuestions: questions.length,
        answeredCount: result.answers.length,
      },
    });
  } catch (error) {
    console.error("Submit Answer Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save answer.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

/**
 * PATCH /api/students/tests/:testId/complete
 * Mark result as completed (completedAt).
 */
const completeResult = async (req, res) => {
  try {
    const studentId = req.user.id;
    const testId = req.params.testId;
    const now = new Date();

    let result = await Result.findOne({ student: studentId, test: testId });
    if (!result) {
      result = await Result.create({
        student: studentId,
        test: testId,
        answers: [],
        completedAt: now,
      });
    } else {
      result.completedAt = now;
      await result.save();
    }

    const correctCount = result.answers.filter((a) => a.isCorrect).length;
    const total = result.answers.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    res.status(200).json({
      success: true,
      message: "Quiz completed",
      data: {
        correctCount,
        total,
        scorePercent,
      },
    });
  } catch (error) {
    console.error("Complete Result Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to complete result.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

/**
 * GET /api/students/tests/:testId/result
 * Get completed test result for this student: test details + answers (user selected, correct, isCorrect).
 */
const getStudentTestResult = async (req, res) => {
  try {
    const studentId = req.user.id;
    const testId = req.params.testId;

    const test = await Test.findById(testId).select("title description questions").lean();
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }
    // Allow inactive tests for result view (student already completed it)

    const result = await Result.findOne({
      student: studentId,
      test: testId,
    }).lean();

    if (!result || !result.answers || result.answers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Result not found. Attempt at least one question to view result.",
      });
    }

    const correctCount = result.answers.filter((a) => a.isCorrect).length;
    const wrongCount = result.answers.filter((a) => !a.isCorrect).length;
    const total = result.answers.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    res.status(200).json({
      success: true,
      message: "Result fetched successfully",
      data: {
        test: {
          _id: test._id,
          title: test.title,
          description: test.description,
          questions: test.questions,
        },
        result: {
          answers: result.answers,
          correctCount,
          wrongCount,
          total,
          scorePercent,
          completedAt: result.completedAt,
        },
      },
    });
  } catch (error) {
    console.error("Get Student Test Result Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch result.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  submitAnswer,
  completeResult,
  getStudentTestResult,
};
