const TeacherSupportConversation = require("../models/teacherSupportConversation.model");

// ─────────────────────────────────────────────
// @desc    Get current teacher's support conversation (all messages)
// @route   GET /api/auth/support
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getMyConversation = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const conversation = await TeacherSupportConversation.findOne({
      teacher: teacherId,
    })
      .sort({ "messages.createdAt": 1 })
      .lean();

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: { messages: [] },
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
    console.error("❌ Get Support Conversation Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load conversation.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Teacher sends a message to admin
// @route   POST /api/auth/support
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { text } = req.body;

    let conversation = await TeacherSupportConversation.findOne({
      teacher: teacherId,
    });

    if (!conversation) {
      conversation = await TeacherSupportConversation.create({
        teacher: teacherId,
        messages: [{ from: "teacher", text: text.trim() }],
      });
    } else {
      conversation.messages.push({ from: "teacher", text: text.trim() });
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
    console.error("❌ Send Support Message Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send message.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Admin replies to a teacher's support thread
// @route   POST /api/auth/support/reply
// @access  Private (Admin/Teacher with support role - protect for now)
// ─────────────────────────────────────────────
const replyToTeacher = async (req, res) => {
  try {
    const { teacherId, text } = req.body;

    let conversation = await TeacherSupportConversation.findOne({
      teacher: teacherId,
    });

    if (!conversation) {
      conversation = await TeacherSupportConversation.create({
        teacher: teacherId,
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
    console.error("❌ Admin Reply Support Error:", error.message);
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
  replyToTeacher,
};
