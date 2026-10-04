const mongoose = require("mongoose");

/**
 * TeacherSupportConversation – one thread per teacher for contact support chat with admin.
 * Messages: from = 'teacher' | 'admin', text, createdAt.
 */
const messageSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      enum: ["teacher", "admin"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
  },
  { timestamps: true, _id: true }
);

const teacherSupportConversationSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      unique: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    adminLastReadAt: {
      type: Date,
      default: null,
      description: "When admin last read this conversation (for unread count)",
    },
  },
  { timestamps: true }
);

teacherSupportConversationSchema.index({ teacher: 1 });

const TeacherSupportConversation = mongoose.model(
  "TeacherSupportConversation",
  teacherSupportConversationSchema
);

module.exports = TeacherSupportConversation;
