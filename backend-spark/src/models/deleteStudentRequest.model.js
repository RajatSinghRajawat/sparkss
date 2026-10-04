const mongoose = require("mongoose");

/**
 * DeleteStudentRequest – records when a student requests account deletion (soft delete).
 * Student account is deactivated (isActive = false); this model keeps id, email, message, status.
 */
const deleteStudentRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "processed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

deleteStudentRequestSchema.index({ student: 1 });
deleteStudentRequestSchema.index({ status: 1 });

const DeleteStudentRequest = mongoose.model("DeleteStudentRequest", deleteStudentRequestSchema);

module.exports = DeleteStudentRequest;
