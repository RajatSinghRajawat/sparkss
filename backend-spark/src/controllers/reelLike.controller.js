const Reel = require("../models/reel.model");
const ReelLike = require("../models/reelLike.model");

// ─────────────────────────────────────────────
// @desc    Toggle like on a reel (like / unlike)
// @route   POST /api/students/reels/:reelId/like
// @access  Private (Student)
// ─────────────────────────────────────────────
const toggleReelLike = async (req, res) => {
  try {
    const { reelId } = req.params;
    const studentId = req.user.id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const existingLike = await ReelLike.findOne({
      reel: reelId,
      likedBy: studentId,
    });

    if (existingLike) {
      await ReelLike.deleteOne({ _id: existingLike._id });
      reel.likes = Math.max(0, (reel.likes || 0) - 1);
      await reel.save();
      return res.status(200).json({
        success: true,
        message: "Reel unliked",
        data: {
          liked: false,
          likesCount: reel.likes,
        },
      });
    }

    await ReelLike.create({
      reel: reelId,
      likedBy: studentId,
    });
    reel.likes = (reel.likes || 0) + 1;
    await reel.save();

    res.status(200).json({
      success: true,
      message: "Reel liked",
      data: {
        liked: true,
        likesCount: reel.likes,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Already liked this reel",
      });
    }
    console.error("❌ Toggle Reel Like Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update like.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get like status for a reel (count + likedByMe)
// @route   GET /api/students/reels/:reelId/like
// @access  Private (Student)
// ─────────────────────────────────────────────
const getReelLikeStatus = async (req, res) => {
  try {
    const { reelId } = req.params;
    const studentId = req.user.id;

    const reel = await Reel.findById(reelId).select("likes");
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const likedByMe = await ReelLike.exists({
      reel: reelId,
      likedBy: studentId,
    });

    res.status(200).json({
      success: true,
      data: {
        likesCount: reel.likes || 0,
        likedByMe: !!likedByMe,
      },
    });
  } catch (error) {
    console.error("❌ Get Reel Like Status Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get like status.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  toggleReelLike,
  getReelLikeStatus,
};
