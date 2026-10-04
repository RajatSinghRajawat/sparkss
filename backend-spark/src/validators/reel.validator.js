const { body, param, query } = require("express-validator");

// ─── Create Reel Validator ───
const createReelValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Reel title is required")
    .isLength({ min: 3, max: 120 })
    .withMessage("Title must be between 3 and 120 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("hashtags")
    .optional()
    .custom((value) => {
      // Accept comma-separated string or JSON array
      if (typeof value === "string") {
        const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length > 15) {
          throw new Error("Maximum 15 hashtags allowed");
        }
        return true;
      }
      if (Array.isArray(value)) {
        if (value.length > 15) {
          throw new Error("Maximum 15 hashtags allowed");
        }
        return true;
      }
      return true;
    }),

  body("duration")
    .optional()
    .isNumeric()
    .withMessage("Duration must be a number (in seconds)")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Duration cannot be negative");
      }
      return true;
    }),
];

// ─── Update Reel Validator ───
const updateReelValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid reel ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("Title must be between 3 and 120 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("category")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("hashtags")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length > 15) {
          throw new Error("Maximum 15 hashtags allowed");
        }
        return true;
      }
      if (Array.isArray(value)) {
        if (value.length > 15) {
          throw new Error("Maximum 15 hashtags allowed");
        }
        return true;
      }
      return true;
    }),

  body("duration")
    .optional()
    .isNumeric()
    .withMessage("Duration must be a number (in seconds)"),
];

// ─── Reel ID Param Validator ───
const reelIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid reel ID"),
];

// ─── Get Reels Query Validator (teacher + student) ───
const getReelsQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "title", "views", "likes"])
    .withMessage("sortBy must be one of: createdAt, title, views, likes"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("order must be asc or desc"),
];

module.exports = {
  createReelValidator,
  updateReelValidator,
  reelIdValidator,
  getReelsQueryValidator,
};

