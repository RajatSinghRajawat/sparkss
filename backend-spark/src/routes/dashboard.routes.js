const express = require("express");
const router = express.Router();
const { getStats } = require("../controllers/dashboard.controller");
const { getChartData } = require("../controllers/dashboardChart.controller");
const { getTodayTests } = require("../controllers/dashboardTodayTest.controller");
const { getTestList } = require("../controllers/dashboardTestList.controller");
const { getTestEnrolledUsers } = require("../controllers/dashboardTestEnrolled.controller");
const { createTest } = require("../controllers/dashboardTestCreate.controller");
const { createTestValidator } = require("../validators/test.validator");
const validate = require("../middlewares/validate");
const {
  getStudentSupportChat,
  getTeacherSupportChat,
  getStudentConversationMessages,
  replyStudentConversation,
  getTeacherConversationMessages,
  replyTeacherConversation,
} = require("../controllers/dashboardSupportChat.controller");
const { getTeacherList, getTeacherById, updateTeacher, getTeacherContent } = require("../controllers/dashboardTeachers.controller");
const { getStudentList, getStudentById, updateStudent, getStudentActivity } = require("../controllers/dashboardStudents.controller");
const {
  getCourseList,
  getCourseVideoUrl,
  uploadCourseMedia,
  createCourse,
} = require("../controllers/dashboardCourses.controller");
const { createCourseValidator } = require("../validators/dashboardCourse.validator");
const {
  getPlaylistList,
  getPlaylistDetail,
  getBannerUploadUrl,
  uploadPlaylistBannerFile,
  createPlaylist,
} = require("../controllers/dashboardPlaylists.controller");
const { createPlaylistValidator } = require("../validators/dashboardPlaylist.validator");
const {
  uploadPlaylistBanner,
  uploadReelMediaAdmin,
  uploadCourseMediaAdmin,
  handleMulterError,
} = require("../middlewares/upload.middleware");
const { getReelList, getReelVideoUrl, uploadReelMedia, createReel } = require("../controllers/dashboardReels.controller");
const { createReelValidator } = require("../validators/dashboardReel.validator");
const { getCategoryList, createCategory } = require("../controllers/dashboardCategories.controller");
const { createCategoryValidator } = require("../validators/dashboardCategory.validator");
const {
  getHomeBannerList,
  uploadHomeBannerFile,
  createHomeBanner,
  deleteHomeBanner,
} = require("../controllers/dashboardHomeBanners.controller");
const { createHomeBannerValidator } = require("../validators/dashboardHomeBanner.validator");
const { protectAdmin } = require("../middlewares/adminAuth.middleware");

// GET /api/admin/dashboard/stats (protected)
router.get("/stats", protectAdmin, getStats);

// GET /api/admin/dashboard/charts?range=1d|1w|1m|1y (protected)
router.get("/charts", protectAdmin, getChartData);

// GET /api/admin/dashboard/today-tests (protected)
router.get("/today-tests", protectAdmin, getTodayTests);

// GET /api/admin/dashboard/tests?page&limit&search&tab=new|complete (protected)
router.get("/tests", protectAdmin, getTestList);
// GET /api/admin/dashboard/tests/:testId/enrolled-users (protected)
router.get("/tests/:testId/enrolled-users", protectAdmin, getTestEnrolledUsers);
// POST /api/admin/dashboard/tests (protected)
router.post("/tests", protectAdmin, createTestValidator, validate, createTest);

// GET /api/admin/dashboard/teachers?page&limit&search&status=all|active|inactive (protected)
router.get("/teachers", protectAdmin, getTeacherList);
// GET /api/admin/dashboard/teachers/:teacherId (protected)
router.get("/teachers/:teacherId", protectAdmin, getTeacherById);
// GET /api/admin/dashboard/teachers/:teacherId/content (protected) – reels, courses, videos, playlists
router.get("/teachers/:teacherId/content", protectAdmin, getTeacherContent);
// PATCH /api/admin/dashboard/teachers/:teacherId (protected)
router.patch("/teachers/:teacherId", protectAdmin, updateTeacher);

// GET /api/admin/dashboard/students?page&limit&search&status=all|active|inactive (protected)
router.get("/students", protectAdmin, getStudentList);
// GET /api/admin/dashboard/students/:studentId (protected)
router.get("/students/:studentId", protectAdmin, getStudentById);
// GET /api/admin/dashboard/students/:studentId/activity (protected) – enrollments, saves, likes, follows, tests
router.get("/students/:studentId/activity", protectAdmin, getStudentActivity);
// PATCH /api/admin/dashboard/students/:studentId (protected)
router.patch("/students/:studentId", protectAdmin, updateStudent);

// GET /api/admin/dashboard/courses?page&limit&search (protected)
router.get("/courses", protectAdmin, getCourseList);
// GET /api/admin/dashboard/courses/:courseId/video-url (protected)
router.get("/courses/:courseId/video-url", protectAdmin, getCourseVideoUrl);
// POST /api/admin/dashboard/courses/upload (protected) – multipart video + thumbnail
router.post(
  "/courses/upload",
  protectAdmin,
  (req, res, next) => {
    uploadCourseMediaAdmin(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadCourseMedia
);
// POST /api/admin/dashboard/courses (protected)
router.post("/courses", protectAdmin, createCourseValidator, validate, createCourse);

// GET /api/admin/dashboard/playlists?page&limit&search (protected)
router.get("/playlists", protectAdmin, getPlaylistList);
// POST /api/admin/dashboard/playlists (protected)
router.post("/playlists", protectAdmin, createPlaylistValidator, validate, createPlaylist);
// POST /api/admin/dashboard/playlists/upload-url (protected) – presigned URL (may hit CORS from browser)
router.post("/playlists/upload-url", protectAdmin, getBannerUploadUrl);
// POST /api/admin/dashboard/playlists/upload-banner (protected) – multipart file, backend uploads to S3 (no CORS)
router.post(
  "/playlists/upload-banner",
  protectAdmin,
  (req, res, next) => {
    uploadPlaylistBanner(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadPlaylistBannerFile
);
// GET /api/admin/dashboard/playlists/:playlistId/detail (protected)
router.get("/playlists/:playlistId/detail", protectAdmin, getPlaylistDetail);

// GET /api/admin/dashboard/categories?page&limit&search (protected)
router.get("/categories", protectAdmin, getCategoryList);
// POST /api/admin/dashboard/categories (protected)
router.post("/categories", protectAdmin, createCategoryValidator, validate, createCategory);

// GET /api/admin/dashboard/home-banners?page&limit (protected)
router.get("/home-banners", protectAdmin, getHomeBannerList);
// POST /api/admin/dashboard/home-banners (protected)
router.post("/home-banners", protectAdmin, createHomeBannerValidator, validate, createHomeBanner);
// POST /api/admin/dashboard/home-banners/upload-banner (protected) – multipart
router.post(
  "/home-banners/upload-banner",
  protectAdmin,
  (req, res, next) => {
    uploadPlaylistBanner(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadHomeBannerFile
);
// DELETE /api/admin/dashboard/home-banners/:bannerId (protected)
router.delete("/home-banners/:bannerId", protectAdmin, deleteHomeBanner);

// GET /api/admin/dashboard/reels?page&limit&search (protected)
router.get("/reels", protectAdmin, getReelList);
// POST /api/admin/dashboard/reels/upload (protected) – multipart video + thumbnail
router.post(
  "/reels/upload",
  protectAdmin,
  (req, res, next) => {
    uploadReelMediaAdmin(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadReelMedia
);
// POST /api/admin/dashboard/reels (protected)
router.post("/reels", protectAdmin, createReelValidator, validate, createReel);
// GET /api/admin/dashboard/reels/:reelId/video-url (protected)
router.get("/reels/:reelId/video-url", protectAdmin, getReelVideoUrl);

// GET /api/admin/dashboard/support-chat/students (protected)
router.get("/support-chat/students", protectAdmin, getStudentSupportChat);
// GET/POST conversation messages (more specific first)
router.get("/support-chat/students/:conversationId/messages", protectAdmin, getStudentConversationMessages);
router.post("/support-chat/students/:conversationId/messages", protectAdmin, replyStudentConversation);

// GET /api/admin/dashboard/support-chat/teachers (protected)
router.get("/support-chat/teachers", protectAdmin, getTeacherSupportChat);
router.get("/support-chat/teachers/:conversationId/messages", protectAdmin, getTeacherConversationMessages);
router.post("/support-chat/teachers/:conversationId/messages", protectAdmin, replyTeacherConversation);

module.exports = router;
