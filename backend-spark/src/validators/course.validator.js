const { body, param, query } = require("express-validator");

// ─── Create Course Validator ───
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
    .withMessage("Video title is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("videoKey")
    .trim()
    .notEmpty()
    .withMessage("videoKey is required (upload video via presigned URL first)")
    .isString()
    .withMessage("videoKey must be a string"),

  body("thumbnailKey")
    .optional({ values: "null" })
    .trim()
    .isString()
    .withMessage("thumbnailKey must be a string"),

  body("duration")
    .optional()
    .isNumeric()
    .withMessage("Duration must be a number (seconds)")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Duration cannot be negative");
      }
      return true;
    }),
];

// ─── Update Course Validator ───
const updateCourseValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid course ID"),

  body("playlist")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid playlist ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("videoKey")
    .optional()
    .trim()
    .isString()
    .withMessage("videoKey must be a string"),

  body("thumbnailKey")
    .optional({ values: "null" })
    .trim()
    .isString()
    .withMessage("thumbnailKey must be a string"),

  body("duration")
    .optional()
    .isNumeric()
    .withMessage("Duration must be a number (seconds)"),
];

// ─── Course ID Param Validator ───
const courseIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid course ID"),
];

// ─── Course ID in param as courseId (for student routes) ───
const courseIdParamValidator = [
  param("courseId")
    .isMongoId()
    .withMessage("Invalid course ID"),
];

// ─── Submit rating (student) ───
const submitRatingValidator = [
  param("courseId")
    .isMongoId()
    .withMessage("Invalid course ID"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
];

// ─── Get Courses Query Validator ───
const getCoursesQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("playlist")
    .optional()
    .isMongoId()
    .withMessage("Invalid playlist ID"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long"),
];

module.exports = {
  createCourseValidator,
  updateCourseValidator,
  courseIdValidator,
  courseIdParamValidator,
  submitRatingValidator,
  getCoursesQueryValidator,
};
