const { body } = require("express-validator");

// ─── Send OTP (Student) ───
const sendOTPValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
];

// ─── Verify OTP & Register Student (email → OTP → name + password) ───
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
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage("Name can only contain letters, spaces, and dots"),

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

  body("fcmToken").optional().trim().isLength({ min: 10 }).withMessage("fcmToken must be at least 10 characters"),
  body("deviceLabel").optional().trim().isLength({ max: 100 }).withMessage("deviceLabel max 100 characters"),
];

// ─── Save FCM token (body: fcmToken required, deviceLabel optional) ───
const saveFcmTokenValidator = [
  body("fcmToken")
    .trim()
    .notEmpty()
    .withMessage("fcmToken is required")
    .isLength({ min: 10 })
    .withMessage("fcmToken must be at least 10 characters"),
  body("deviceLabel")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("deviceLabel cannot exceed 100 characters"),
];

// ─── Login (Student) ───
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

  body("fcmToken").optional().trim().isLength({ min: 10 }).withMessage("fcmToken must be at least 10 characters"),
  body("deviceLabel").optional().trim().isLength({ max: 100 }).withMessage("deviceLabel max 100 characters"),
];

// ─── Update Profile (name, phone, avatarKey optional) ───
const updateProfileValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage("Name can only contain letters, spaces, and dots"),

  body("phone")
    .optional()
    .trim()
    .custom((val) => val === "" || /^\d{10}$/.test(val))
    .withMessage("Phone must be empty or a valid 10-digit number"),

  body("avatarKey")
    .optional()
    .custom((val) => val === undefined || val === null || typeof val === "string")
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

// ─── Delete Account (email, message) ───
const deleteAccountValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Reason or message is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Message must be between 1 and 500 characters"),
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
  deleteAccountValidator,
  saveFcmTokenValidator,
};
