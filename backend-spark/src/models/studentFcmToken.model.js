const mongoose = require("mongoose");

/**
 * Student FCM token – one document per (student, fcmToken).
 * A student can have multiple devices; each device token is stored separately.
 * Used to send push notifications to the student's device(s).
 */
const studentFcmTokenSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
      index: true,
    },
    fcmToken: {
      type: String,
      required: [true, "FCM token is required"],
      trim: true,
      minlength: [10, "FCM token must be at least 10 characters"],
    },
    deviceLabel: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, "Device label cannot exceed 100 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// One record per student + token (same device re-registering updates this doc)
studentFcmTokenSchema.index({ student: 1, fcmToken: 1 }, { unique: true });

const StudentFcmToken = mongoose.model("StudentFcmToken", studentFcmTokenSchema);

module.exports = StudentFcmToken;
