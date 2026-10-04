const express = require("express");
const router = express.Router();
const {
  sendOTP,
  verifyOTPAndRegister,
  resendOTP,
  login,
  getMe,
  getAvatarUploadUrl,
  updateProfile,
  changePassword,
} = require("../controllers/auth.controller");
const { replyToStudent } = require("../controllers/help.controller");
const { getDashboard } = require("../controllers/teacherDashboard.controller");
const {
  getMyConversation: getMySupportConversation,
  sendMessage: sendSupportMessage,
  replyToTeacher,
} = require("../controllers/support.controller");
const {
  sendOTPValidator,
  verifyOTPAndRegisterValidator,
  loginValidator,
  updateProfileValidator,
  avatarUploadUrlValidator,
  changePasswordValidator,
} = require("../validators/auth.validator");
const { replyHelpValidator } = require("../validators/help.validator");
const {
  sendSupportMessageValidator,
  replySupportValidator,
} = require("../validators/support.validator");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Teacher Authentication & Registration
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SendOTPRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: teacher@sparks.com
 *
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *         - name
 *         - phone
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: teacher@sparks.com
 *         otp:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           example: "123456"
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           example: Santosh Sharma
 *         phone:
 *           type: string
 *           pattern: '^\d{10}$'
 *           example: "9876543210"
 *         password:
 *           type: string
 *           minLength: 6
 *           example: Teacher@123
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 */

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to teacher's email for registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully to your email
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                       example: 5 minutes
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Teacher already registered
 *       500:
 *         description: Server error
 */
router.post("/send-otp", sendOTPValidator, validate, sendOTP);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and register teacher
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *     responses:
 *       201:
 *         description: Teacher registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration successful! Welcome to Sparks 🎉"
 *                 data:
 *                   type: object
 *                   properties:
 *                     teacher:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         isVerified:
 *                           type: boolean
 *                         createdAt:
 *                           type: string
 *                     token:
 *                       type: string
 *                       description: JWT Token
 *       400:
 *         description: Invalid OTP or validation error
 *       409:
 *         description: Teacher already registered
 *       429:
 *         description: Too many failed OTP attempts
 *       500:
 *         description: Server error
 */
router.post(
  "/verify-otp",
  verifyOTPAndRegisterValidator,
  validate,
  verifyOTPAndRegister
);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP to teacher's email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       409:
 *         description: Teacher already registered
 *       500:
 *         description: Server error
 */
router.post("/resend-otp", sendOTPValidator, validate, resendOTP);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login teacher with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: teacher@sparks.com
 *               password:
 *                 type: string
 *                 example: Teacher@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     teacher:
 *                       type: object
 *                     token:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 *       500:
 *         description: Server error
 */
router.post("/login", loginValidator, validate, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current teacher profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher profile
 *       401:
 *         description: Not authorized
 */
router.get("/me", protect, getMe);

/**
 * @swagger
 * /api/auth/dashboard:
 *   get:
 *     summary: Get teacher dashboard overview (stats + recent activity)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Not authorized
 */
router.get("/dashboard", protect, getDashboard);

router.post(
  "/avatar-upload-url",
  protect,
  avatarUploadUrlValidator,
  validate,
  getAvatarUploadUrl
);

router.patch(
  "/me",
  protect,
  updateProfileValidator,
  validate,
  updateProfile
);

router.post(
  "/change-password",
  protect,
  changePasswordValidator,
  validate,
  changePassword
);

router.post(
  "/help/reply",
  replyHelpValidator,
  validate,
  protect,
  replyToStudent
);

// ─── Teacher Contact Support (chat with admin) ───
router.get("/support", protect, getMySupportConversation);
router.post(
  "/support",
  protect,
  sendSupportMessageValidator,
  validate,
  sendSupportMessage
);
router.post(
  "/support/reply",
  protect,
  replySupportValidator,
  validate,
  replyToTeacher
);

module.exports = router;

