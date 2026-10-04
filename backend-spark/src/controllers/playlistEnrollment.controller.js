const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const Playlist = require("../models/playlist.model");

// ─────────────────────────────────────────────
// @desc    Enroll student in a playlist
// @route   POST /api/students/playlists/:playlistId/enroll
// @access  Private (Student)
// ─────────────────────────────────────────────
const enrollInPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const studentId = req.user.id;
    const adWatched = req.body?.adWatched === true; // optional: set when user completed reward ad before enrolling

    const playlist = await Playlist.findOne({
      _id: playlistId,
      isActive: true,
    });
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    const existing = await PlaylistEnrollment.findOne({
      playlist: playlistId,
      student: studentId,
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already enrolled",
        data: { enrolled: true },
      });
    }

    await PlaylistEnrollment.create({
      playlist: playlistId,
      student: studentId,
    });

    if (adWatched) {
      console.log(`📺 Enrolled after ad: playlist=${playlistId} student=${studentId}`);
    }

    res.status(201).json({
      success: true,
      message: "Enrolled successfully",
      data: { enrolled: true },
    });
  } catch (error) {
    console.error("❌ Enroll in Playlist Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to enroll.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get enrollment status for current student
// @route   GET /api/students/playlists/:playlistId/enroll
// @access  Private (Student)
// ─────────────────────────────────────────────
const getEnrollmentStatus = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const studentId = req.user.id;

    const enrollment = await PlaylistEnrollment.findOne({
      playlist: playlistId,
      student: studentId,
    });

    res.status(200).json({
      success: true,
      data: { enrolled: !!enrollment },
    });
  } catch (error) {
    console.error("❌ Get Enrollment Status Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get enrollment status.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  enrollInPlaylist,
  getEnrollmentStatus,
};
