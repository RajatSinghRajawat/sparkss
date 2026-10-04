/**
 * Dashboard support chat lists – admin only.
 * GET /api/admin/dashboard/support-chat/students
 * GET /api/admin/dashboard/support-chat/teachers
 */

const HelpConversation = require("../models/helpConversation.model");
const TeacherSupportConversation = require("../models/teacherSupportConversation.model");

// ─────────────────────────────────────────────
// @desc    Get student support chat list (admin only)
// @route   GET /api/admin/dashboard/support-chat/students?search=...&filter=all|unread|read
// @access  Private (Admin)
// Sorted by updatedAt desc (last activity first). unreadCount = messages from student after adminLastReadAt.
// ─────────────────────────────────────────────
const getStudentSupportChat = async (req, res) => {
  try {
    const search = (req.query.search || "").trim().toLowerCase();
    const filter = req.query.filter === "unread" || req.query.filter === "read" ? req.query.filter : "all";

    const conversations = await HelpConversation.find()
      .sort({ updatedAt: -1 })
      .populate("student", "name email")
      .lean();

    let list = conversations.map((c) => {
      const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
      const adminLastReadAt = c.adminLastReadAt ? new Date(c.adminLastReadAt).getTime() : 0;
      const unreadCount = (c.messages || []).filter(
        (m) => m.from !== "admin" && new Date(m.createdAt).getTime() > adminLastReadAt
      ).length;
      return {
        _id: c._id.toString(),
        name: c.student?.name ?? "—",
        email: c.student?.email ?? "—",
        message: lastMsg?.text ?? "—",
        updatedAt: c.updatedAt,
        unreadCount,
      };
    });

    if (search) {
      list = list.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(search)) ||
          (item.email && item.email.toLowerCase().includes(search)) ||
          (item.message && item.message.toLowerCase().includes(search))
      );
    }
    if (filter === "unread") list = list.filter((item) => item.unreadCount > 0);
    if (filter === "read") list = list.filter((item) => item.unreadCount === 0);

    res.status(200).json({
      success: true,
      data: { list },
    });
  } catch (error) {
    console.error("❌ Dashboard getStudentSupportChat Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load student support chat.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get teacher support chat list (admin only)
// @route   GET /api/admin/dashboard/support-chat/teachers?search=...&filter=all|unread|read
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTeacherSupportChat = async (req, res) => {
  try {
    const search = (req.query.search || "").trim().toLowerCase();
    const filter = req.query.filter === "unread" || req.query.filter === "read" ? req.query.filter : "all";

    const conversations = await TeacherSupportConversation.find()
      .sort({ updatedAt: -1 })
      .populate("teacher", "name email")
      .lean();

    let list = conversations.map((c) => {
      const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
      const adminLastReadAt = c.adminLastReadAt ? new Date(c.adminLastReadAt).getTime() : 0;
      const unreadCount = (c.messages || []).filter(
        (m) => m.from !== "admin" && new Date(m.createdAt).getTime() > adminLastReadAt
      ).length;
      return {
        _id: c._id.toString(),
        name: c.teacher?.name ?? "—",
        email: c.teacher?.email ?? "—",
        message: lastMsg?.text ?? "—",
        updatedAt: c.updatedAt,
        unreadCount,
      };
    });

    if (search) {
      list = list.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(search)) ||
          (item.email && item.email.toLowerCase().includes(search)) ||
          (item.message && item.message.toLowerCase().includes(search))
      );
    }
    if (filter === "unread") list = list.filter((item) => item.unreadCount > 0);
    if (filter === "read") list = list.filter((item) => item.unreadCount === 0);

    res.status(200).json({
      success: true,
      data: { list },
    });
  } catch (error) {
    console.error("❌ Dashboard getTeacherSupportChat Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load teacher support chat.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get messages for a student conversation (admin only)
// @route   GET /api/admin/dashboard/support-chat/students/:conversationId/messages
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getStudentConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await HelpConversation.findById(conversationId)
      .populate("student", "name email")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    await HelpConversation.findByIdAndUpdate(conversationId, {
      adminLastReadAt: new Date(),
    });

    const messages = (conversation.messages || []).map((m) => ({
      _id: m._id,
      from: m.from,
      text: m.text,
      createdAt: m.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        conversation: {
          _id: conversation._id.toString(),
          name: conversation.student?.name ?? "—",
          email: conversation.student?.email ?? "—",
        },
        messages,
      },
    });
  } catch (error) {
    console.error("❌ getStudentConversationMessages Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load messages.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Admin reply in student conversation
// @route   POST /api/admin/dashboard/support-chat/students/:conversationId/messages
// @access  Private (Admin)
// ─────────────────────────────────────────────
const replyStudentConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    const conversation = await HelpConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    conversation.messages.push({ from: "admin", text: (text || "").trim() });
    await conversation.save();

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
    console.error("❌ replyStudentConversation Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send reply.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get messages for a teacher conversation (admin only)
// @route   GET /api/admin/dashboard/support-chat/teachers/:conversationId/messages
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getTeacherConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await TeacherSupportConversation.findById(conversationId)
      .populate("teacher", "name email")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    await TeacherSupportConversation.findByIdAndUpdate(conversationId, {
      adminLastReadAt: new Date(),
    });

    const messages = (conversation.messages || []).map((m) => ({
      _id: m._id,
      from: m.from,
      text: m.text,
      createdAt: m.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        conversation: {
          _id: conversation._id.toString(),
          name: conversation.teacher?.name ?? "—",
          email: conversation.teacher?.email ?? "—",
        },
        messages,
      },
    });
  } catch (error) {
    console.error("❌ getTeacherConversationMessages Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load messages.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Admin reply in teacher conversation
// @route   POST /api/admin/dashboard/support-chat/teachers/:conversationId/messages
// @access  Private (Admin)
// ─────────────────────────────────────────────
const replyTeacherConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    const conversation = await TeacherSupportConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    conversation.messages.push({ from: "admin", text: (text || "").trim() });
    await conversation.save();

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
    console.error("❌ replyTeacherConversation Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send reply.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getStudentSupportChat,
  getTeacherSupportChat,
  getStudentConversationMessages,
  replyStudentConversation,
  getTeacherConversationMessages,
  replyTeacherConversation,
};
