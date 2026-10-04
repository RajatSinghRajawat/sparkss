const express = require("express");
const router = express.Router();
const {
  getBannerUploadUrl,
  createPlaylist,
  getMyPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
} = require("../controllers/playlist.controller");
const {
  createPlaylistValidator,
  updatePlaylistValidator,
  playlistIdValidator,
} = require("../validators/playlist.validator");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth.middleware");

// All routes are protected — teacher must be logged in
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Playlists
 *   description: Teacher Playlist Management (AWS S3 Direct Upload for Banner)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Playlist:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         banner:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               description: Presigned URL of the banner image on S3
 *             key:
 *               type: string
 *               description: S3 object key of the banner
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
 *
 *     CreatePlaylistRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: "Physics Chapter 1"
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: "All videos related to Newton's Laws"
 *         bannerKey:
 *           type: string
 *           description: "S3 object key of the uploaded banner (optional)"
 *           example: "playlists/banners/1700000000000-abcde12345.jpg"
 */

/**
 * @swagger
 * /api/playlists/upload-url:
 *   post:
 *     summary: Get presigned URL for direct S3 banner upload
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bannerType
 *             properties:
 *               bannerType:
 *                 type: string
 *                 example: "image/jpeg"
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
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
 *                     banner:
 *                       type: object
 *                       properties:
 *                         uploadUrl:
 *                           type: string
 *                         key:
 *                           type: string
 *                         fileUrl:
 *                           type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post("/upload-url", getBannerUploadUrl);

/**
 * @swagger
 * /api/playlists:
 *   post:
 *     summary: Create a new playlist (after S3 banner upload)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlaylistRequest'
 *     responses:
 *       201:
 *         description: Playlist created successfully
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
 *                     playlist:
 *                       $ref: '#/components/schemas/Playlist'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       409:
 *         description: Playlist name already exists
 */
router.post("/", createPlaylistValidator, validate, createPlaylist);

/**
 * @swagger
 * /api/playlists:
 *   get:
 *     summary: Get all playlists of logged-in teacher (with pagination & search)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
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
 *         description: Playlists fetched successfully
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
 *                     playlists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Playlist'
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
router.get("/", getMyPlaylists);

/**
 * @swagger
 * /api/playlists/{id}:
 *   get:
 *     summary: Get a single playlist by ID
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist fetched
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Playlist not found
 */
router.get("/:id", playlistIdValidator, validate, getPlaylistById);

/**
 * @swagger
 * /api/playlists/{id}:
 *   put:
 *     summary: Update a playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Updated Playlist Name"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               bannerKey:
 *                 type: string
 *                 description: "New S3 banner key (pass null to remove banner)"
 *     responses:
 *       200:
 *         description: Playlist updated successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Playlist not found
 *       409:
 *         description: Duplicate playlist name
 */
router.put("/:id", updatePlaylistValidator, validate, updatePlaylist);

/**
 * @swagger
 * /api/playlists/{id}:
 *   delete:
 *     summary: Delete a playlist (also deletes banner from S3)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Playlist not found
 */
router.delete("/:id", playlistIdValidator, validate, deletePlaylist);

module.exports = router;

