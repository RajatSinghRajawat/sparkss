const mongoose = require("mongoose");

/**
 * Test (quiz) created by teacher.
 * - startTime: when test starts (user sets only this).
 * - perQuestionMinutes + perQuestionSeconds: time per question → endTime is auto-computed.
 * - questions: array of { questionText, options[], correctAnswer } (correctAnswer = index 0-based).
 */
const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
      maxlength: [2000, "Question text cannot exceed 2000 characters"],
    },
    options: {
      type: [String],
      required: [true, "Options are required"],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length >= 2 && v.every((o) => typeof o === "string" && o.trim().length > 0);
        },
        message: "At least 2 non-empty options are required",
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, "Correct answer index is required"],
      min: 0,
      description: "Index of correct option (0-based)",
    },
  },
  { _id: true }
);

// Validate correctAnswer is within options length (Mongoose 9: no next param, use async)
questionSchema.pre("validate", function () {
  if (this.options && typeof this.correctAnswer === "number") {
    if (this.correctAnswer < 0 || this.correctAnswer >= this.options.length) {
      throw new Error("correctAnswer must be a valid option index");
    }
  }
});

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Test title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },
    banner: {
      url: {
        type: String,
        default: null,
      },
      key: {
        type: String,
        default: null,
        description: "S3 object key of the test banner image",
      },
    },
    startTime: {
      type: Date,
      required: [true, "Test start time is required"],
      description: "When the test starts (date and time)",
    },
    perQuestionMinutes: {
      type: Number,
      required: [true, "Per question minutes is required"],
      min: 0,
      default: 0,
    },
    perQuestionSeconds: {
      type: Number,
      required: [true, "Per question seconds is required"],
      min: 0,
      max: 59,
      default: 0,
    },
    endTime: {
      type: Date,
      default: null,
      description: "Auto-computed: startTime + (perQuestion time × number of questions)",
    },
    questions: {
      type: [questionSchema],
      default: [],
      validate: {
        validator(v) {
          return Array.isArray(v);
        },
        message: "Questions must be an array",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
      description: "Teacher who created the test; null when created by admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // ─── Notification scheduler bookkeeping (dedup so each push fires once) ───
    startReminderSentAt: {
      type: Date,
      default: null,
      description: "When the 'test about to start' push was sent to subscribers",
    },
    resultsNotifiedAt: {
      type: Date,
      default: null,
      description: "When the 'results available' push was sent to subscribers",
    },
  },
  {
    timestamps: true,
  }
);

// ─── Auto-compute endTime before save (Mongoose 9: no next param) ───
testSchema.pre("save", function () {
  if (this.startTime && this.questions && this.questions.length > 0) {
    const totalSecondsPerQuestion = (Number(this.perQuestionMinutes) || 0) * 60 + (Number(this.perQuestionSeconds) || 0);
    const totalDurationMs = totalSecondsPerQuestion * this.questions.length * 1000;
    this.endTime = new Date(this.startTime.getTime() + totalDurationMs);
  } else {
    this.endTime = null;
  }
});

testSchema.index({ createdBy: 1, createdAt: -1 });
testSchema.index({ title: "text", description: "text" });
testSchema.index({ startTime: 1, endTime: 1 });

const Test = mongoose.model("Test", testSchema);

module.exports = Test;
