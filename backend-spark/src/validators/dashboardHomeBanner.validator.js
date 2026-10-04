const { body } = require("express-validator");

/**
 * Admin create home banner – title optional, link optional, imageKey required, order optional.
 */
const createHomeBannerValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("link")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Link cannot exceed 500 characters"),

  body("imageKey")
    .trim()
    .notEmpty()
    .withMessage("Banner image is required"),

  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer")
    .toInt(),
];

module.exports = {
  createHomeBannerValidator,
};
