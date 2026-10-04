const { query } = require("express-validator");

// ─── Saved reels list query (page, limit) ───
const savedReelsQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
];

module.exports = {
  savedReelsQueryValidator,
};
