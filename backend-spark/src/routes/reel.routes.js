const express = require("express");
const router = express.Router();
const {
  getUploadUrls,
  uploadReelMedia,
  createReel,
  getMyReels,
  getReelById,
  updateReel,
  deleteReel,
} = require("../controllers/reel.controller");
const { uploadReelMediaAdmin, handleMulterError } = require("../middlewares/upload.middleware");
const {
  createReelValidator,
  updateReelValidator,
  reelIdValidator,
  getReelsQueryValidator,
} = require("../validators/reel.validator");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth.middleware");

// All routes are protected — teacher must be logged in
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Reels
 *   description: Teacher Reel Upload & Management (AWS S3 Storage)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Reel:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         video:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *             key:
 *               type: string
 *         thumbnail:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *             key:
 *               type: string
 *         category:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *         duration:
 *           type: number
 *           description: Duration in seconds
 *         createdBy:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         views:
 *           type: number
 *         likes:
 *           type: number
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

/**
 * @swagger
 * /api/reels/upload-url:
 *   post:
 *     summary: Get presigned S3 upload URLs for video & thumbnail (Step 1)
 *     tags: [Reels]
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
 *                 description: "Video MIME type"
 *                 example: "video/mp4"
 *               thumbnailType:
 *                 type: string
 *                 description: "Thumbnail MIME type (optional)"
 *                 example: "image/jpeg"
 *     responses:
 *       200:
 *         description: Presigned upload URLs generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     video:
 *                       type: object
 *                       properties:
 *                         uploadUrl:
 *                           type: string
 *                         key:
 *                           type: string
 *                         fileUrl:
 *                           type: string
 *                     thumbnail:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         uploadUrl:
 *                           type: string
 *                         key:
 *                           type: string
 *                         fileUrl:
 *                           type: string
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post("/upload-url", getUploadUrls);

/**
 * @swagger
 * /api/reels/upload:
 *   post:
 *     summary: Upload reel video + thumbnail via backend (multipart; avoids CORS)
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [video]
 *             properties:
 *               video: { type: string, format: binary }
 *               thumbnail: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Upload complete; returns videoKey, thumbnailKey, urls
 *       400:
 *         description: Missing video or invalid file
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post("/upload", uploadReelMediaAdmin, handleMulterError, uploadReelMedia);

/**
 * @swagger
 * /api/reels:
 *   post:
 *     summary: Create a new reel after uploading to S3 (Step 2)
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - videoKey
 *             properties:
 *               videoKey:
 *                 type: string
 *                 description: "S3 key returned from upload-url step"
 *                 example: "reels/videos/1234-abcd.mp4"
 *               thumbnailKey:
 *                 type: string
 *                 description: "S3 key for thumbnail (optional)"
 *                 example: "reels/thumbnails/1234-abcd.jpg"
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 120
 *                 example: "Newton's Laws in 60 Seconds"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Quick explanation of Newton's three laws of motion"
 *               category:
 *                 type: string
 *                 description: "Category ObjectId"
 *                 example: "665a1b2c3d4e5f6a7b8c9d0e"
 *               hashtags:
 *                 type: string
 *                 description: "Comma-separated hashtags"
 *                 example: "physics, newton, science, laws"
 *               duration:
 *                 type: number
 *                 description: "Video duration in seconds"
 *                 example: 60
 *     responses:
 *       201:
 *         description: Reel created successfully
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
 *                     reel:
 *                       $ref: '#/components/schemas/Reel'
 *       400:
 *         description: Validation error or missing videoKey
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  createReelValidator,
  validate,
  createReel
);

/**
 * @swagger
 * /api/reels:
 *   get:
 *     summary: Get all reels of logged-in teacher (paginated, searchable, filterable)
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Reels per page (max 50)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, description, or hashtags
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title, views, likes]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Reels fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reels:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reel'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         hasMore:
 *                           type: boolean
 *       401:
 *         description: Not authorized
 */
router.get("/", getReelsQueryValidator, validate, getMyReels);

/**
 * @swagger
 * /api/reels/{id}:
 *   get:
 *     summary: Get a single reel by ID
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reel ID
 *     responses:
 *       200:
 *         description: Reel fetched
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Reel not found
 */
router.get("/:id", reelIdValidator, validate, getReelById);

/**
 * @swagger
 * /api/reels/{id}:
 *   put:
 *     summary: Update reel details (title, description, category, hashtags, duration)
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Reel Title"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               category:
 *                 type: string
 *                 example: "665a1b2c3d4e5f6a7b8c9d0e"
 *               hashtags:
 *                 type: string
 *                 example: "physics, updated"
 *               duration:
 *                 type: number
 *                 example: 45
 *     responses:
 *       200:
 *         description: Reel updated successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Reel not found
 */
router.put("/:id", updateReelValidator, validate, updateReel);

/**
 * @swagger
 * /api/reels/{id}:
 *   delete:
 *     summary: Delete a reel (also deletes video & thumbnail from S3)
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reel ID
 *     responses:
 *       200:
 *         description: Reel deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Reel not found
 */
router.delete("/:id", reelIdValidator, validate, deleteReel);

module.exports = router;

