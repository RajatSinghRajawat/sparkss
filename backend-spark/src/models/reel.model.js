const mongoose = require("mongoose");

const reelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Reel title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    video: {
      url: {
        type: String,
        required: [true, "Video URL is required"],
      },
      key: {
        type: String,
        required: [true, "Video S3 key is required"], // S3 object key
      },
    },
    thumbnail: {
      url: {
        type: String,
        default: null,
      },
      key: {
        type: String,
        default: null,
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    hashtags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
      description: "Teacher owner; null when created by admin for themselves",
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      description: "Admin owner when reel is created by admin for themselves",
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes for fast queries ───
reelSchema.index({ createdBy: 1, createdAt: -1 }, { sparse: true });
reelSchema.index({ createdByAdmin: 1, createdAt: -1 }, { sparse: true });
reelSchema.index({ category: 1 });
reelSchema.index({ hashtags: 1 });
reelSchema.index({ title: "text", description: "text" }); // Full-text search

const Reel = mongoose.model("Reel", reelSchema);

module.exports = Reel;

