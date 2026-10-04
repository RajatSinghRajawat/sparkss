const { body } = require("express-validator");

// ─── Send OTP Validator ───
const sendOTPValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  // Optional: lets the server reject a taken number before sending the OTP.
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Phone must be a valid 10-digit number"),
];

// ─── Verify OTP & Register Validator ───
const verifyOTPAndRegisterValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters")
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage("Name can only contain letters, spaces, and dots"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\d{10}$/)
    .withMessage("Phone must be a valid 10-digit number"),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

// ─── Login Validator ───
const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required"),
];

// ─── Update Profile Validator (name, phone, avatarKey optional) ───
const updateProfileValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters")
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage("Name can only contain letters, spaces, and dots"),

  body("phone")
    .optional()
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Phone must be a valid 10-digit number"),

  body("avatarKey")
    .optional()
    .trim()
    .isString()
    .withMessage("avatarKey must be a string"),
];

// ─── Avatar upload URL (body: avatarType) ───
const avatarUploadUrlValidator = [
  body("avatarType")
    .trim()
    .notEmpty()
    .withMessage("avatarType is required (e.g. image/jpeg)")
    .isIn(["image/jpeg", "image/jpg", "image/png", "image/webp"])
    .withMessage("avatarType must be image/jpeg, image/png, or image/webp"),
];

// ─── Change Password (currentPassword, newPassword) ───
const changePasswordValidator = [
  body("currentPassword")
    .trim()
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

module.exports = {
  sendOTPValidator,
  verifyOTPAndRegisterValidator,
  loginValidator,
  updateProfileValidator,
  avatarUploadUrlValidator,
  changePasswordValidator,
};

