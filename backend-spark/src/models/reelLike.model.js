const mongoose = require("mongoose");

/**
 * ReelLike – student reel like (reel id + jisne like kiya uski id)
 * One student can like a reel only once (unique compound index).
 */
const reelLikeSchema = new mongoose.Schema(
  {
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      required: [true, "Reel ID is required"],
    },
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID (likedBy) is required"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── One like per student per reel ───
reelLikeSchema.index({ reel: 1, likedBy: 1 }, { unique: true });
reelLikeSchema.index({ likedBy: 1 });
reelLikeSchema.index({ reel: 1 });

const ReelLike = mongoose.model("ReelLike", reelLikeSchema);

module.exports = ReelLike;
