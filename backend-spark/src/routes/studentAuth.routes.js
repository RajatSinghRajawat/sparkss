const express = require("express");
const router = express.Router();
const {
  sendOTP,
  verifyOTPAndRegister,
  resendOTP,
  login,
  getMe,
  getProfile,
  getAvatarUploadUrl,
  updateProfile,
  changePassword,
  requestDeleteAccount,
  saveFcmToken,
} = require("../controllers/studentAuth.controller");
const { getReelsForStudents } = require("../controllers/reel.controller");
const {
  toggleReelLike,
  getReelLikeStatus,
} = require("../controllers/reelLike.controller");
const { recordReelView } = require("../controllers/reelView.controller");
const {
  toggleReelSave,
  getReelSaveStatus,
  getMySavedReels,
} = require("../controllers/reelSave.controller");
const {
  toggleFollow,
  getFollowStatus,
  getMyFollowingList,
} = require("../controllers/follow.controller");
const { getTeacherById } = require("../controllers/teacher.controller");
const { getStudentTestList, getTestByIdForStudent } = require("../controllers/test.controller");
const { submitAnswer, completeResult, getStudentTestResult } = require("../controllers/result.controller");
const {
  toggleTestNotification,
  getTestNotificationStatus,
} = require("../controllers/testNotification.controller");
const {
  getPlaylistsForStudents,
  getPlaylistByIdForStudent,
} = require("../controllers/playlist.controller");
const {
  getCoursesByPlaylistForStudent,
  getCourseByIdForStudent,
} = require("../controllers/course.controller");
const {
  enrollInPlaylist,
  getEnrollmentStatus,
} = require("../controllers/playlistEnrollment.controller");
const {
  submitRating,
  getMyRating,
} = require("../controllers/courseRating.controller");
const {
  getMyConversation,
  sendMessage: sendHelpMessage,
} = require("../controllers/help.controller");
const { getStudentHome, getStudentSearch } = require("../controllers/studentHome.controller");
const {
  sendOTPValidator,
  verifyOTPAndRegisterValidator,
  loginValidator,
  updateProfileValidator,
  avatarUploadUrlValidator,
  changePasswordValidator,
  deleteAccountValidator,
  saveFcmTokenValidator,
} = require("../validators/studentAuth.validator");
const { getReelsQueryValidator } = require("../validators/reel.validator");
const { reelIdParamValidator } = require("../validators/reelLike.validator");
const { savedReelsQueryValidator } = require("../validators/reelSave.validator");
const {
  teacherIdParamValidator,
  getFollowingListQueryValidator,
} = require("../validators/follow.validator");
const { getStudentTestsQueryValidator, testIdValidator, testIdParamValidator, submitAnswerValidator } = require("../validators/test.validator");
const {
  getStudentPlaylistsQueryValidator,
  studentPlaylistIdValidator,
} = require("../validators/playlist.validator");
const {
  courseIdParamValidator,
  submitRatingValidator,
} = require("../validators/course.validator");
const { sendHelpMessageValidator } = require("../validators/help.validator");
const validate = require("../middlewares/validate");
const { protectStudent } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student registration & login (email → OTP → verify → name + password)
 */

/**
 * @swagger
 * /api/students/send-otp:
 *   post:
 *     summary: Send OTP to student email for registration
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       409:
 *         description: Student already registered with this email
 */
router.post("/send-otp", sendOTPValidator, validate, sendOTP);

/**
 * @swagger
 * /api/students/verify-otp:
 *   post:
 *     summary: Verify OTP and create student account (name + password)
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, name, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Student registered successfully
 *       400:
 *         description: Invalid or expired OTP
 *       409:
 *         description: Student already registered
 */
router.post(
  "/verify-otp",
  verifyOTPAndRegisterValidator,
  validate,
  verifyOTPAndRegister
);

/**
 * @swagger
 * /api/students/resend-otp:
 *   post:
 *     summary: Resend OTP to student email
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP resent successfully
 */
router.post("/resend-otp", sendOTPValidator, validate, resendOTP);

/**
 * @swagger
 * /api/students/login:
 *   post:
 *     summary: Login student with email and password
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginValidator, validate, login);

/**
 * @swagger
 * /api/students/fcm-token:
 *   post:
 *     summary: Save FCM push token for current student (after login / on app open)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken: { type: string, minLength: 10 }
 *               deviceLabel: { type: string, maxLength: 100 }
 *     responses:
 *       200:
 *         description: FCM token saved
 *       401:
 *         description: Not authorized
 */
router.post(
  "/fcm-token",
  saveFcmTokenValidator,
  validate,
  protectStudent,
  saveFcmToken
);

/**
 * @swagger
 * /api/students/reels:
 *   get:
 *     summary: Get reels for students (paginated, searchable)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in title, description, hashtags
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category ID
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, title, views, likes], default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Reels list with pagination
 *       401:
 *         description: Not authorized
 */
router.get("/reels", getReelsQueryValidator, validate, protectStudent, getReelsForStudents);

/**
 * @swagger
 * /api/students/reels/saved:
 *   get:
 *     summary: Get reels saved by the logged-in student (paginated, newest save first)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *         description: Max 50
 *     responses:
 *       200:
 *         description: Saved reels list with pagination
 *       401:
 *         description: Not authorized
 */
router.get(
  "/reels/saved",
  savedReelsQueryValidator,
  validate,
  protectStudent,
  getMySavedReels
);

/**
 * @swagger
 * /api/students/playlists:
 *   get:
 *     summary: Get playlists for students (paginated, searchable)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or description
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, name], default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Playlists list with pagination
 *       401:
 *         description: Not authorized
 */
router.get(
  "/playlists",
  getStudentPlaylistsQueryValidator,
  validate,
  protectStudent,
  getPlaylistsForStudents
);

router.get(
  "/playlists/:playlistId",
  studentPlaylistIdValidator,
  validate,
  protectStudent,
  getPlaylistByIdForStudent
);

router.get(
  "/playlists/:playlistId/courses",
  studentPlaylistIdValidator,
  validate,
  protectStudent,
  getCoursesByPlaylistForStudent
);

router.get(
  "/playlists/:playlistId/enroll",
  studentPlaylistIdValidator,
  validate,
  protectStudent,
  getEnrollmentStatus
);

router.post(
  "/playlists/:playlistId/enroll",
  studentPlaylistIdValidator,
  validate,
  protectStudent,
  enrollInPlaylist
);

router.get(
  "/courses/:courseId",
  courseIdParamValidator,
  validate,
  protectStudent,
  getCourseByIdForStudent
);

router.get(
  "/courses/:courseId/rate",
  courseIdParamValidator,
  validate,
  protectStudent,
  getMyRating
);

router.post(
  "/courses/:courseId/rate",
  submitRatingValidator,
  validate,
  protectStudent,
  submitRating
);

/**
 * @swagger
 * /api/students/reels/{reelId}/like:
 *   get:
 *     summary: Get reel like status (count + likedByMe)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema: { type: string }
 *         description: Reel ID
 *     responses:
 *       200:
 *         description: Like count and whether current student liked
 *       404:
 *         description: Reel not found
 */
router.get(
  "/reels/:reelId/like",
  reelIdParamValidator,
  validate,
  protectStudent,
  getReelLikeStatus
);

/**
 * @swagger
 * /api/students/reels/{reelId}/like:
 *   post:
 *     summary: Toggle like on a reel (like / unlike)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema: { type: string }
 *         description: Reel ID
 *     responses:
 *       200:
 *         description: Liked or unliked; returns liked boolean and likesCount
 *       404:
 *         description: Reel not found
 */
router.post(
  "/reels/:reelId/like",
  reelIdParamValidator,
  validate,
  protectStudent,
  toggleReelLike
);

/**
 * @swagger
 * /api/students/reels/{reelId}/view:
 *   post:
 *     summary: Record a view on a reel (student viewed reel)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema: { type: string }
 *         description: Reel ID
 *     responses:
 *       201:
 *         description: View recorded; returns viewsCount
 *       404:
 *         description: Reel not found
 */
router.post(
  "/reels/:reelId/view",
  reelIdParamValidator,
  validate,
  protectStudent,
  recordReelView
);

/**
 * @swagger
 * /api/students/reels/{reelId}/save:
 *   get:
 *     summary: Get save status for a reel (savedByMe)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema: { type: string }
 *         description: Reel ID
 *     responses:
 *       200:
 *         description: savedByMe boolean
 *       404:
 *         description: Reel not found
 */
router.get(
  "/reels/:reelId/save",
  reelIdParamValidator,
  validate,
  protectStudent,
  getReelSaveStatus
);

/**
 * @swagger
 * /api/students/reels/{reelId}/save:
 *   post:
 *     summary: Toggle save on a reel (save / unsave)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema: { type: string }
 *         description: Reel ID
 *     responses:
 *       200:
 *         description: Saved or unsaved; returns saved boolean
 *       404:
 *         description: Reel not found
 */
router.post(
  "/reels/:reelId/save",
  reelIdParamValidator,
  validate,
  protectStudent,
  toggleReelSave
);

/**
 * @swagger
 * /api/students/following:
 *   get:
 *     summary: Get list of teachers the student is following
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Max 50
 *     responses:
 *       200:
 *         description: List of followed teachers with pagination
 *       401:
 *         description: Not authorized
 */
router.get(
  "/following",
  getFollowingListQueryValidator,
  validate,
  protectStudent,
  getMyFollowingList
);

/**
 * @swagger
 * /api/students/teachers/{teacherId}:
 *   get:
 *     summary: Get teacher profile by ID (name, avatar, followers count, paginated reels)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema: { type: string }
 *         description: Teacher ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page for reels (5 per page default)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5 }
 *         description: Reels per page (max 20)
 *     responses:
 *       200:
 *         description: Teacher profile with reels and pagination
 *       404:
 *         description: Teacher not found
 */
router.get(
  "/teachers/:teacherId",
  teacherIdParamValidator,
  validate,
  protectStudent,
  getTeacherById
);

/**
 * @swagger
 * /api/students/teachers/{teacherId}/follow:
 *   get:
 *     summary: Get follow status (is current student following this teacher?)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema: { type: string }
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher info and following boolean
 *       404:
 *         description: Teacher not found
 */
router.get(
  "/teachers/:teacherId/follow",
  teacherIdParamValidator,
  validate,
  protectStudent,
  getFollowStatus
);

/**
 * @swagger
 * /api/students/teachers/{teacherId}/follow:
 *   post:
 *     summary: Toggle follow (student follows / unfollows teacher)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema: { type: string }
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Following or unfollowed; returns following boolean and teacher
 *       404:
 *         description: Teacher not found
 */
router.post(
  "/teachers/:teacherId/follow",
  teacherIdParamValidator,
  validate,
  protectStudent,
  toggleFollow
);

/**
 * @swagger
 * /api/students/me:
 *   get:
 *     summary: Get current student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile
 *       401:
 *         description: Not authorized
 */
/**
 * @swagger
 * /api/students/tests:
 *   get:
 *     summary: Get test list for student (completed or today), paginated
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [completed, today], default: today }
 *         description: "completed = tests that have ended; today = tests starting today"
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Tests list with pagination
 *       400:
 *         description: Invalid type
 *       401:
 *         description: Not authorized
 */
router.get(
  "/tests",
  getStudentTestsQueryValidator,
  validate,
  protectStudent,
  getStudentTestList
);

router.get(
  "/tests/:testId/result",
  testIdParamValidator,
  validate,
  protectStudent,
  getStudentTestResult
);

// ─── Per-test notification subscription (bell) ───
router.get(
  "/tests/:testId/notify",
  testIdParamValidator,
  validate,
  protectStudent,
  getTestNotificationStatus
);
router.post(
  "/tests/:testId/notify",
  testIdParamValidator,
  validate,
  protectStudent,
  toggleTestNotification
);

router.get(
  "/tests/:id",
  testIdValidator,
  validate,
  protectStudent,
  getTestByIdForStudent
);

router.post(
  "/tests/:testId/answer",
  submitAnswerValidator,
  validate,
  protectStudent,
  submitAnswer
);

router.patch(
  "/tests/:testId/complete",
  testIdParamValidator,
  validate,
  protectStudent,
  completeResult
);

router.get("/me", protectStudent, getMe);

/**
 * @swagger
 * /api/students/home:
 *   get:
 *     summary: Get home page data (banners, top courses, reels, long videos)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Home data with banners, topPlaylists, topReels, topLongVideos
 *       401:
 *         description: Not authorized
 */
router.get("/home", protectStudent, getStudentHome);

/**
 * @swagger
 * /api/students/search:
 *   get:
 *     summary: Search teachers, reels, courses, playlists (for home screen)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (also accepts 'search')
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Max results per type (teachers, reels, courses, playlists). Cap 20.
 *     responses:
 *       200:
 *         description: Search results with teachers, reels, courses, playlists
 *       401:
 *         description: Not authorized
 */
router.get("/search", protectStudent, getStudentSearch);

/**
 * @swagger
 * /api/students/avatar-upload-url:
 *   post:
 *     summary: Get presigned URL to upload student avatar (photo)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [avatarType]
 *             properties:
 *               avatarType:
 *                 type: string
 *                 enum: [image/jpeg, image/jpg, image/png, image/webp]
 *     responses:
 *       200:
 *         description: uploadUrl, key, fileUrl
 *       401:
 *         description: Not authorized
 */
router.post(
  "/avatar-upload-url",
  avatarUploadUrlValidator,
  validate,
  protectStudent,
  getAvatarUploadUrl
);

/**
 * @swagger
 * /api/students/me:
 *   patch:
 *     summary: Update student profile (name, phone, avatar)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *               avatarKey:
 *                 type: string
 *                 description: S3 key from avatar-upload-url (empty string to remove photo)
 *     responses:
 *       200:
 *         description: Profile updated; returns student object
 *       409:
 *         description: Phone already used by another account
 *       401:
 *         description: Not authorized
 */
router.patch(
  "/me",
  updateProfileValidator,
  validate,
  protectStudent,
  updateProfile
);

/**
 * @swagger
 * /api/students/change-password:
 *   post:
 *     summary: Change student password (current + new)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Must include uppercase, lowercase, and number
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 *       400:
 *         description: Validation error (e.g. new password too weak)
 */
router.post(
  "/change-password",
  changePasswordValidator,
  validate,
  protectStudent,
  changePassword
);

/**
 * @swagger
 * /api/students/delete-account:
 *   post:
 *     summary: Request account deletion (soft delete; deactivates account and stores request)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, message]
 *             properties:
 *               email: { type: string, format: email }
 *               message: { type: string, minLength: 1, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Account deactivated
 *       400:
 *         description: Email does not match account or validation error
 */
router.post(
  "/delete-account",
  deleteAccountValidator,
  validate,
  protectStudent,
  requestDeleteAccount
);

/**
 * @swagger
 * /api/students/profile:
 *   get:
 *     summary: Get student profile data (image, name, email, enrolled course count, avg test score, completed test count)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data with stats
 *       401:
 *         description: Not authorized
 */
router.get("/profile", protectStudent, getProfile);

/**
 * @swagger
 * /api/students/help:
 *   get:
 *     summary: Get help conversation (messages with admin)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get("/help", protectStudent, getMyConversation);

/**
 * @swagger
 * /api/students/help:
 *   post:
 *     summary: Send a message to admin (help/support)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post(
  "/help",
  sendHelpMessageValidator,
  validate,
  protectStudent,
  sendHelpMessage
);

module.exports = router;
