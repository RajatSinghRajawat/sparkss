const { body, param } = require("express-validator");

// ─── Create Category Validator ───
const createCategoryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),
];

// ─── Update Category Validator ───
const updateCategoryValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),
];

// ─── Delete / Get by ID Validator ───
const categoryIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid category ID"),
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
};

