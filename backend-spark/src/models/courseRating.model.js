const mongoose = require("mongoose");

/**
 * CourseRating – student rating for a course (lesson/video in a playlist).
 * One rating per student per course (unique). Rating 1–5.
 */
const courseRatingSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
  },
  {
    timestamps: true,
  }
);

courseRatingSchema.index({ course: 1, student: 1 }, { unique: true });
courseRatingSchema.index({ course: 1 });

const CourseRating = mongoose.model("CourseRating", courseRatingSchema);

module.exports = CourseRating;
