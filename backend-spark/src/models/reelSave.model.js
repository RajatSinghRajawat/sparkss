const mongoose = require("mongoose");

/**
 * ReelSave – student reel save (reel id + jisne save kiya uski id)
 * One student can save a reel only once (unique compound index).
 */
const reelSaveSchema = new mongoose.Schema(
  {
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      required: [true, "Reel ID is required"],
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID (savedBy) is required"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── One save per student per reel ───
reelSaveSchema.index({ reel: 1, savedBy: 1 }, { unique: true });
reelSaveSchema.index({ savedBy: 1 });
reelSaveSchema.index({ reel: 1 });

const ReelSave = mongoose.model("ReelSave", reelSaveSchema);

module.exports = ReelSave;
