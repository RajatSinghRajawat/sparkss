const HelpConversation = require("../models/helpConversation.model");

// ─────────────────────────────────────────────
// @desc    Get current student's help conversation (all messages)
// @route   GET /api/students/help
// @access  Private (Student)
// ─────────────────────────────────────────────
const getMyConversation = async (req, res) => {
  try {
    const studentId = req.user.id;

    let conversation = await HelpConversation.findOne({ student: studentId })
      .sort({ "messages.createdAt": 1 })
      .lean();

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: {
          messages: [],
        },
      });
    }

    const messages = (conversation.messages || []).map((m) => ({
      _id: m._id,
      from: m.from,
      text: m.text,
      createdAt: m.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    console.error("❌ Get Help Conversation Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load conversation.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Student sends a message to admin
// @route   POST /api/students/help
// @access  Private (Student)
// ─────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { text } = req.body;

    let conversation = await HelpConversation.findOne({ student: studentId });

    if (!conversation) {
      conversation = await HelpConversation.create({
        student: studentId,
        messages: [{ from: "student", text: text.trim() }],
      });
    } else {
      conversation.messages.push({ from: "student", text: text.trim() });
      await conversation.save();
    }

    const lastMsg = conversation.messages[conversation.messages.length - 1];

    res.status(201).json({
      success: true,
      message: "Message sent",
      data: {
        message: {
          _id: lastMsg._id,
          from: lastMsg.from,
          text: lastMsg.text,
          createdAt: lastMsg.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("❌ Send Help Message Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send message.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Admin (teacher) replies to a student's help thread
// @route   POST /api/auth/help/reply
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const replyToStudent = async (req, res) => {
  try {
    const { studentId, text } = req.body;

    let conversation = await HelpConversation.findOne({ student: studentId });

    if (!conversation) {
      conversation = await HelpConversation.create({
        student: studentId,
        messages: [{ from: "admin", text: text.trim() }],
      });
    } else {
      conversation.messages.push({ from: "admin", text: text.trim() });
      await conversation.save();
    }

    const lastMsg = conversation.messages[conversation.messages.length - 1];

    res.status(201).json({
      success: true,
      message: "Reply sent",
      data: {
        message: {
          _id: lastMsg._id,
          from: lastMsg.from,
          text: lastMsg.text,
          createdAt: lastMsg.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("❌ Admin Reply Help Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send reply.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getMyConversation,
  sendMessage,
  replyToStudent,
};
