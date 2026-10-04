const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Playlist name is required"],
      trim: true,
      minlength: [2, "Playlist name must be at least 2 characters"],
      maxlength: [100, "Playlist name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    banner: {
      url: {
        type: String,
        default: null,
      },
      key: {
        type: String,
        default: null,
        description: "S3 object key of the banner image",
      },
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
      description: "Admin owner when playlist is created by admin for themselves",
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

// ─── Unique playlist name per teacher ───
playlistSchema.index({ name: 1, createdBy: 1 }, { unique: true, sparse: true });
// ─── Unique playlist name per admin ───
playlistSchema.index({ name: 1, createdByAdmin: 1 }, { unique: true, sparse: true });

const Playlist = mongoose.model("Playlist", playlistSchema);

module.exports = Playlist;

