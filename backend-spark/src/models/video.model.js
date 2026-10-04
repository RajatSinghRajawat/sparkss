const mongoose = require("mongoose");

/**
 * Teacher long-form video uploads (standalone, not tied to playlist/course).
 * Video and thumbnail stored on S3; url/key pattern same as Course/Reel.
 */
const videoSchema = new mongoose.Schema(
  {
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
      maxlength: [2000, "Description cannot exceed 2000 characters"],
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
        description: "S3 object key of the uploaded video",
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
      required: [true, "Teacher ID is required"],
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

videoSchema.index({ createdBy: 1, createdAt: -1 });
videoSchema.index({ title: "text", description: "text" });

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
