const CourseRating = require("../models/courseRating.model");
const Course = require("../models/course.model");

// ─────────────────────────────────────────────
// @desc    Submit or update rating for a course (one per student per course)
// @route   POST /api/students/courses/:courseId/rate
// @access  Private (Student)
// ─────────────────────────────────────────────
const submitRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating } = req.body;
    const studentId = req.user.id;

    if (rating == null || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      isActive: true,
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const existing = await CourseRating.findOne({
      course: courseId,
      student: studentId,
    });

    if (existing) {
      existing.rating = Number(rating);
      await existing.save();
      return res.status(200).json({
        success: true,
        message: "Rating updated",
        data: { rating: existing.rating },
      });
    }

    const newRating = await CourseRating.create({
      course: courseId,
      student: studentId,
      rating: Number(rating),
    });

    res.status(201).json({
      success: true,
      message: "Rating submitted",
      data: { rating: newRating.rating },
    });
  } catch (error) {
    console.error("❌ Submit Course Rating Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to submit rating.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get current student's rating for a course
// @route   GET /api/students/courses/:courseId/rate
// @access  Private (Student)
// ─────────────────────────────────────────────
const getMyRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const ratingDoc = await CourseRating.findOne({
      course: courseId,
      student: studentId,
    });

    res.status(200).json({
      success: true,
      data: {
        rated: !!ratingDoc,
        rating: ratingDoc ? ratingDoc.rating : null,
      },
    });
  } catch (error) {
    console.error("❌ Get My Rating Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get rating.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  submitRating,
  getMyRating,
};
