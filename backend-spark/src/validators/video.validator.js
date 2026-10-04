const { body, param, query } = require("express-validator");

const createVideoValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Video title is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

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
      if (Number(value) < 0) throw new Error("Duration cannot be negative");
      return true;
    }),
];

const updateVideoValidator = [
  param("id").isMongoId().withMessage("Invalid video ID"),
  body("title")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("videoKey").optional().trim().isString().withMessage("videoKey must be a string"),
  body("thumbnailKey")
    .optional({ values: "null" })
    .trim()
    .isString()
    .withMessage("thumbnailKey must be a string"),
  body("duration").optional().isNumeric().withMessage("Duration must be a number (seconds)"),
];

const videoIdValidator = [param("id").isMongoId().withMessage("Invalid video ID")];

const getVideosQueryValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("search").optional().trim().isLength({ max: 100 }).withMessage("Search query too long"),
];

module.exports = {
  createVideoValidator,
  updateVideoValidator,
  videoIdValidator,
  getVideosQueryValidator,
};
