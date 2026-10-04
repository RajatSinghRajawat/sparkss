const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    playlist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playlist",
      required: [true, "Playlist is required"],
    },
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    video: {
      url: {
        type: String,
        default: null,
      },
      key: {
        type: String,
        required: [true, "Video S3 key is required"],
        description: "S3 object key of the course video",
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
        description: "S3 object key of the video thumbnail",
      },
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
      description: "Video length in seconds",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
      description: "Teacher owner; null when created by admin (see createdByAdmin)",
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      description: "Admin owner when course is created by admin",
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
courseSchema.index({ createdBy: 1, createdAt: -1 });
courseSchema.index({ createdByAdmin: 1, createdAt: -1 });
courseSchema.index({ playlist: 1 });
courseSchema.index({ title: "text", description: "text" });

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
