const mongoose = require("mongoose");

/**
 * ReelView – reel view record
 * reel id + jish student ne reel dekha hai uski id
 * Har view event store hota hai (total views count ke liye).
 */
const reelViewSchema = new mongoose.Schema(
  {
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      required: [true, "Reel ID is required"],
    },
    viewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID (viewedBy) is required"],
    },
  },
  {
    timestamps: true,
  }
);

reelViewSchema.index({ reel: 1 });
reelViewSchema.index({ viewedBy: 1 });
reelViewSchema.index({ reel: 1, viewedBy: 1 });

const ReelView = mongoose.model("ReelView", reelViewSchema);

module.exports = ReelView;
