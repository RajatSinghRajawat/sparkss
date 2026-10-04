const Reel = require("../models/reel.model");
const ReelView = require("../models/reelView.model");

// ─────────────────────────────────────────────
// @desc    Record a view on a reel (student viewed reel)
// @route   POST /api/students/reels/:reelId/view
// @access  Private (Student)
// ─────────────────────────────────────────────
const recordReelView = async (req, res) => {
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

    await ReelView.create({
      reel: reelId,
      viewedBy: studentId,
    });

    reel.views = (reel.views || 0) + 1;
    await reel.save();

    res.status(201).json({
      success: true,
      message: "View recorded",
      data: {
        reelId,
        viewsCount: reel.views,
      },
    });
  } catch (error) {
    console.error("❌ Record Reel View Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to record view.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  recordReelView,
};
