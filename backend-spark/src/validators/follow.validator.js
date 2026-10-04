const { param, query } = require("express-validator");

// ─── Teacher ID param (for follow routes: /teachers/:teacherId/follow) ───
const teacherIdParamValidator = [
  param("teacherId")
    .trim()
    .notEmpty()
    .withMessage("Teacher ID is required")
    .isMongoId()
    .withMessage("Invalid teacher ID"),
];

// ─── Get following list query (page, limit) ───
const getFollowingListQueryValidator = [
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
  teacherIdParamValidator,
  getFollowingListQueryValidator,
};
