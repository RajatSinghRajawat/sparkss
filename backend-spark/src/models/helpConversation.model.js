const mongoose = require("mongoose");

/**
 * HelpConversation – one thread per student for help/support chat with admin (teacher).
 * Messages: from = 'student' | 'admin', text, createdAt.
 */
const messageSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      enum: ["student", "admin"],
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

const helpConversationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
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

helpConversationSchema.index({ student: 1 });

const HelpConversation = mongoose.model(
  "HelpConversation",
  helpConversationSchema
);

module.exports = HelpConversation;
