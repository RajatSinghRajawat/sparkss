const mongoose = require("mongoose");

/**
 * Follow – student teacher ko follow karta hai
 * teacher id + jis student ne follow kiya uski id
 * One student can follow a teacher only once (unique compound index).
 */
const followSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher ID is required"],
    },
    followedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID (followedBy) is required"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── One follow per student per teacher ───
followSchema.index({ teacher: 1, followedBy: 1 }, { unique: true });
followSchema.index({ followedBy: 1 });
followSchema.index({ teacher: 1 });

const Follow = mongoose.model("Follow", followSchema);

module.exports = Follow;
