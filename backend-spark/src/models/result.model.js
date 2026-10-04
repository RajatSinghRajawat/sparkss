const mongoose = require("mongoose");

/**
 * Result: one document per student per test attempt.
 * Stores each answer: question number, option user chose, correct option index, and whether correct.
 */
const answerSchema = new mongoose.Schema(
  {
    questionNumber: {
      type: Number,
      required: true,
      min: 0,
      description: "0-based question index",
    },
    userSelectedOption: {
      type: Number,
      required: true,
      min: 0,
      description: "0-based index of option the student selected",
    },
    correctOption: {
      type: Number,
      required: true,
      min: 0,
      description: "0-based index of the correct option",
    },
    isCorrect: {
      type: Boolean,
      required: true,
      description: "Whether userSelectedOption === correctOption",
    },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: [true, "Test ID is required"],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
      description: "Set when student submits or time expires",
    },
  },
  { timestamps: true }
);

resultSchema.index({ student: 1, test: 1 });
resultSchema.index({ test: 1 });

const Result = mongoose.model("Result", resultSchema);

module.exports = Result;
