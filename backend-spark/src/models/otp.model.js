const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["register", "student_register", "reset-password", "verify-email"],
    default: "register",
  },
  attempts: {
    type: Number,
    default: 0,
    max: [5, "Too many attempts. Please request a new OTP."],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // OTP auto-deletes after 5 minutes (300 seconds)
  },
});

// ─── Index for faster lookups ───
otpSchema.index({ email: 1, purpose: 1 });

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;

