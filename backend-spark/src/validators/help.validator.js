const { body } = require("express-validator");

// ─── Student send message ───
const sendHelpMessageValidator = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Message text is required")
    .isLength({ max: 2000 })
    .withMessage("Message cannot exceed 2000 characters"),
];

// ─── Admin reply (teacher) ───
const replyHelpValidator = [
  body("studentId")
    .trim()
    .notEmpty()
    .withMessage("studentId is required")
    .isMongoId()
    .withMessage("Invalid student ID"),
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Reply text is required")
    .isLength({ max: 2000 })
    .withMessage("Reply cannot exceed 2000 characters"),
];

module.exports = {
  sendHelpMessageValidator,
  replyHelpValidator,
};
