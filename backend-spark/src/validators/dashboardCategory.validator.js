const { body } = require("express-validator");

/**
 * Admin create category – name required, createdBy (teacherId) optional.
 * Omit createdBy to create category for admin themselves.
 */
const createCategoryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),

  body("createdBy")
    .optional()
    .isMongoId()
    .withMessage("Invalid teacher ID"),
];

module.exports = {
  createCategoryValidator,
};
