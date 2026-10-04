const { body } = require("express-validator");

// ─── Teacher send message ───
const sendSupportMessageValidator = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Message text is required")
    .isLength({ max: 2000 })
    .withMessage("Message cannot exceed 2000 characters"),
];

// ─── Admin reply to teacher ───
const replySupportValidator = [
  body("teacherId")
    .trim()
    .notEmpty()
    .withMessage("teacherId is required")
    .isMongoId()
    .withMessage("Invalid teacher ID"),
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Reply text is required")
    .isLength({ max: 2000 })
    .withMessage("Reply cannot exceed 2000 characters"),
];

module.exports = {
  sendSupportMessageValidator,
  replySupportValidator,
};
