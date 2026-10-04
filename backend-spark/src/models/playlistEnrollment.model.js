const mongoose = require("mongoose");

/**
 * PlaylistEnrollment – student enrolled in a playlist.
 * One record per student per playlist (unique enrollment).
 */
const playlistEnrollmentSchema = new mongoose.Schema(
  {
    playlist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playlist",
      required: [true, "Playlist is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
  },
  {
    timestamps: true,
  }
);

playlistEnrollmentSchema.index({ playlist: 1, student: 1 }, { unique: true });
playlistEnrollmentSchema.index({ student: 1 });

const PlaylistEnrollment = mongoose.model(
  "PlaylistEnrollment",
  playlistEnrollmentSchema
);

module.exports = PlaylistEnrollment;
