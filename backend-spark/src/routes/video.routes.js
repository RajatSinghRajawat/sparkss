const express = require("express");
const router = express.Router();
const {
  getUploadUrls,
  createVideo,
  getMyVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
} = require("../controllers/video.controller");
const {
  createVideoValidator,
  updateVideoValidator,
  videoIdValidator,
  getVideosQueryValidator,
} = require("../validators/video.validator");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth.middleware");

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: Teacher long-form video uploads (title, description, thumbnail, video, duration, createdBy)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Video:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         video:
 *           type: object
 *           properties:
 *             url: { type: string }
 *             key: { type: string }
 *         thumbnail:
 *           type: object
 *           properties:
 *             url: { type: string }
 *             key: { type: string }
 *         duration: { type: number }
 *         createdBy:
 *           type: object
 *           properties:
 *             _id: { type: string }
 *             name: { type: string }
 *             email: { type: string }
 *         isActive: { type: boolean }
 *         createdAt: { type: string }
 *         updatedAt: { type: string }
 */

/**
 * @swagger
 * /api/videos/upload-url:
 *   post:
 *     summary: Get presigned S3 upload URLs for video and thumbnail
 *     tags: [Videos]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [videoType]
 *             properties:
 *               videoType: { type: string, example: "video/mp4" }
 *               thumbnailType: { type: string, example: "image/jpeg" }
 *     responses:
 *       200: { description: Upload URLs generated }
 *       401: { description: Not authorized }
 */
router.post("/upload-url", getUploadUrls);

/**
 * @swagger
 * /api/videos:
 *   post:
 *     summary: Create video (after uploading to S3)
 *     tags: [Videos]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, videoKey]
 *             properties:
 *               title: { type: string, minLength: 2, maxLength: 200 }
 *               description: { type: string, maxLength: 2000 }
 *               videoKey: { type: string }
 *               thumbnailKey: { type: string }
 *               duration: { type: number }
 *     responses:
 *       201: { description: Video created }
 *       400: { description: Validation error }
 *       401: { description: Not authorized }
 */
router.post("/", createVideoValidator, validate, createVideo);

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Get all videos of logged-in teacher (paginated, searchable)
 *     tags: [Videos]
 *     security: [{ bearerAuth: [] }]
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
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200: { description: Videos fetched successfully }
 *       401: { description: Not authorized }
 */
router.get("/", getVideosQueryValidator, validate, getMyVideos);

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     summary: Get single video by ID
 *     tags: [Videos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Video details }
 *       404: { description: Video not found }
 */
router.get("/:id", videoIdValidator, validate, getVideoById);

/**
 * @swagger
 * /api/videos/{id}:
 *   put:
 *     summary: Update video (title, description, duration, videoKey, thumbnailKey)
 *     tags: [Videos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               duration: { type: number }
 *               videoKey: { type: string }
 *               thumbnailKey: { type: string }
 *     responses:
 *       200: { description: Video updated }
 *       404: { description: Video not found }
 */
router.put("/:id", updateVideoValidator, validate, updateVideo);

/**
 * @swagger
 * /api/videos/{id}:
 *   delete:
 *     summary: Delete video (removes from S3 and DB)
 *     tags: [Videos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Video deleted }
 *       404: { description: Video not found }
 */
router.delete("/:id", videoIdValidator, validate, deleteVideo);

module.exports = router;
