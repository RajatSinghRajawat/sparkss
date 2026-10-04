const PlaylistEnrollment = require("../models/playlistEnrollment.model");

const playlistIdOf = (course) => {
  const p = course?.playlist;
  if (!p) return null;
  return String(p._id ?? p);
};

/**
 * Remove the playable video URL from courses in playlists the student hasn't
 * enrolled in. Lists used to carry signed video URLs for every course, which
 * let anyone skip the enroll (and ad) step. Thumbnails stay; playback goes
 * through GET /api/students/courses/:id, which checks enrollment.
 */
async function hideLockedVideoUrls(courses, studentId) {
  if (!Array.isArray(courses) || courses.length === 0) return courses;
  const playlistIds = [...new Set(courses.map(playlistIdOf).filter(Boolean))];
  const enrolled = new Set(
    (
      await PlaylistEnrollment.find({ student: studentId, playlist: { $in: playlistIds } }).distinct("playlist")
    ).map(String)
  );
  return courses.map((c) =>
    enrolled.has(playlistIdOf(c)) || !c.video
      ? c
      : { ...c, video: { ...c.video, url: null, key: null } }
  );
}

module.exports = { hideLockedVideoUrls };
