const { body } = require("express-validator");

/**
 * Admin create reel – title, category, videoKey, createdBy (teacher) required.
 */
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
      if (typeof value === "string") {
        const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length > 15) throw new Error("Maximum 15 hashtags allowed");
        return true;
      }
      if (Array.isArray(value) && value.length > 15) throw new Error("Maximum 15 hashtags allowed");
      return true;
    }),

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
    .optional()
    .trim()
    .custom((value) => {
      if (value === "" || value == null || value === undefined) return true;
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(value)) throw new Error("Invalid teacher ID");
      return true;
    }),
];

module.exports = {
  createReelValidator,
};
