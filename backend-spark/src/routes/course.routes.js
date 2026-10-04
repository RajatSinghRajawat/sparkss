const express = require("express");
const router = express.Router();
const {
  getUploadUrls,
  createCourse,
  getMyCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require("../controllers/course.controller");
const {
  createCourseValidator,
  updateCourseValidator,
  courseIdValidator,
  getCoursesQueryValidator,
} = require("../validators/course.validator");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth.middleware");

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Teacher Course (Video) Management - playlist, video, thumbnail, title, description, duration
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         playlist:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *         title:
 *           type: string
 *           description: Video title
 *         description:
 *           type: string
 *           description: Video description
 *         video:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               description: Presigned view URL
 *             key:
 *               type: string
 *         thumbnail:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *             key:
 *               type: string
 *         duration:
 *           type: number
 *           description: Video length in seconds
 *         createdBy:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

/**
 * @swagger
 * /api/courses/upload-url:
 *   post:
 *     summary: Get presigned S3 upload URLs for course video & thumbnail
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoType
 *             properties:
 *               videoType:
 *                 type: string
 *                 example: "video/mp4"
 *               thumbnailType:
 *                 type: string
 *                 example: "image/jpeg"
 *     responses:
 *       200:
 *         description: Upload URLs generated
 *       400:
 *         description: videoType required
 *       401:
 *         description: Not authorized
 */
router.post("/upload-url", getUploadUrls);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course (after uploading video/thumbnail to S3)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playlist
 *               - title
 *               - videoKey
 *             properties:
 *               playlist:
 *                 type: string
 *                 description: Playlist ObjectId
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 200
 *                 description: Video title
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               videoKey:
 *                 type: string
 *                 description: S3 key from upload-url step
 *               thumbnailKey:
 *                 type: string
 *                 description: S3 key for thumbnail (optional)
 *               duration:
 *                 type: number
 *                 description: Video length in seconds
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Validation error or missing videoKey
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Playlist not found
 */
router.post("/", createCourseValidator, validate, createCourse);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses of logged-in teacher (paginated, filter by playlist, search)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: playlist
 *         schema:
 *           type: string
 *         description: Filter by playlist ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Courses fetched successfully
 *       401:
 *         description: Not authorized
 */
router.get("/", getCoursesQueryValidator, validate, getMyCourses);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get single course by ID
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details
 *       404:
 *         description: Course not found
 */
router.get("/:id", courseIdValidator, validate, getCourseById);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update course (title, description, duration, video, thumbnail, playlist)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: number
 *               videoKey:
 *                 type: string
 *               thumbnailKey:
 *                 type: string
 *               playlist:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       404:
 *         description: Course not found
 */
router.put("/:id", updateCourseValidator, validate, updateCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete course (removes video & thumbnail from S3)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 */
router.delete("/:id", courseIdValidator, validate, deleteCourse);

module.exports = router;
