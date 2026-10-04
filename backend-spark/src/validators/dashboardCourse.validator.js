const { body } = require("express-validator");

/**
 * Admin create course – playlist, title, videoKey, createdBy (teacher) required.
 */
const createCourseValidator = [
  body("playlist")
    .trim()
    .notEmpty()
    .withMessage("Playlist is required")
    .isMongoId()
    .withMessage("Invalid playlist ID"),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Course title is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("duration")
    .optional()
    .isNumeric()
    .withMessage("Duration must be a number (seconds)")
    .custom((v) => (Number(v) < 0 ? Promise.reject(new Error("Duration cannot be negative")) : true)),

  body("videoKey")
    .trim()
    .notEmpty()
    .withMessage("videoKey is required (upload video first)"),

  body("thumbnailKey")
    .optional()
    .trim(),

  body("createdBy")
    .trim()
    .notEmpty()
    .withMessage("Teacher is required for course")
    .isMongoId()
    .withMessage("Invalid teacher ID"),
];

module.exports = {
  createCourseValidator,
};
