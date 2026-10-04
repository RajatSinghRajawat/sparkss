const { body, param, query } = require("express-validator");

// ─── Question item validator (for body.questions.*) ───
const questionValidator = (value) => {
  if (!Array.isArray(value)) {
    throw new Error("questions must be an array");
  }
  for (let i = 0; i < value.length; i++) {
    const q = value[i];
    if (!q || typeof q !== "object") {
      throw new Error(`questions[${i}] must be an object`);
    }
    if (!q.questionText || typeof q.questionText !== "string" || q.questionText.trim().length < 1) {
      throw new Error(`questions[${i}].questionText is required`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new Error(`questions[${i}].options must have at least 2 options`);
    }
    if (!q.options.every((o) => typeof o === "string" && o.trim().length > 0)) {
      throw new Error(`questions[${i}].options must be non-empty strings`);
    }
    const idx = Number(q.correctAnswer);
    if (Number.isNaN(idx) || idx < 0 || idx >= q.options.length) {
      throw new Error(`questions[${i}].correctAnswer must be a valid option index (0 to ${q.options.length - 1})`);
    }
  }
  return true;
};

// ─── Create Test Validator ───
const createTestValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Test title is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("bannerKey")
    .optional({ values: "null" })
    .trim()
    .isString()
    .withMessage("bannerKey must be a string"),

  body("startTime")
    .notEmpty()
    .withMessage("Test start time is required")
    .isISO8601()
    .withMessage("startTime must be a valid ISO 8601 date-time"),

  body("perQuestionMinutes")
    .optional()
    .isInt({ min: 0 })
    .withMessage("perQuestionMinutes must be a non-negative integer"),

  body("perQuestionSeconds")
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage("perQuestionSeconds must be between 0 and 59"),

  body("questions")
    .optional()
    .custom(questionValidator),
];

// ─── Update Test Validator ───
const updateTestValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid test ID"),

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

  body("bannerKey")
    .optional({ values: "null" })
    .trim()
    .isString()
    .withMessage("bannerKey must be a string"),

  body("startTime")
    .optional()
    .isISO8601()
    .withMessage("startTime must be a valid ISO 8601 date-time"),

  body("perQuestionMinutes")
    .optional()
    .isInt({ min: 0 })
    .withMessage("perQuestionMinutes must be a non-negative integer"),

  body("perQuestionSeconds")
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage("perQuestionSeconds must be between 0 and 59"),

  body("questions")
    .optional()
    .custom(questionValidator),
];

// ─── Test ID Param Validator ───
const testIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid test ID"),
];

const testIdParamValidator = [
  param("testId")
    .isMongoId()
    .withMessage("Invalid test ID"),
];

// ─── Submit answer body (student) ───
const submitAnswerValidator = [
  param("testId")
    .isMongoId()
    .withMessage("Invalid test ID"),
  body("questionNumber")
    .isInt({ min: 0 })
    .withMessage("questionNumber must be a non-negative integer"),
  body("selectedOption")
    .isInt({ min: 0 })
    .withMessage("selectedOption must be a non-negative integer"),
];

// ─── Get Tests Query Validator ───
const getTestsQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "title", "startTime", "endTime"])
    .withMessage("Invalid sortBy"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("order must be asc or desc"),
];

// ─── Student get tests list query (type = completed | today, page, limit) ───
const getStudentTestsQueryValidator = [
  query("type")
    .optional()
    .isIn(["completed", "today", "my_completed"])
    .withMessage("type must be 'today', 'completed' or 'my_completed'"),

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
  createTestValidator,
  updateTestValidator,
  testIdValidator,
  testIdParamValidator,
  getTestsQueryValidator,
  getStudentTestsQueryValidator,
  submitAnswerValidator,
};
