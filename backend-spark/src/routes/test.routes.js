const express = require("express");
const router = express.Router();
const {
  getBannerUploadUrl,
  createTest,
  getMyTests,
  getTestById,
  updateTest,
  deleteTest,
  announceToTestSubscribers,
} = require("../controllers/test.controller");
const {
  createTestValidator,
  updateTestValidator,
  testIdValidator,
  getTestsQueryValidator,
} = require("../validators/test.validator");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth.middleware");

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Tests
 *   description: Teacher tests - title, description, banner, start/end time, per-question time, questions & correct answers
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TestQuestion:
 *       type: object
 *       properties:
 *         questionText: { type: string }
 *         options: { type: array, items: { type: string } }
 *         correctAnswer: { type: number, description: "Index of correct option (0-based)" }
 *     Test:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         banner: { type: object, properties: { url: { type: string }, key: { type: string } } }
 *         startTime: { type: string, format: date-time }
 *         perQuestionMinutes: { type: number }
 *         perQuestionSeconds: { type: number }
 *         endTime: { type: string, format: date-time, description: "Auto-computed from startTime + perQuestion time * questions count" }
 *         questions: { type: array, items: { $ref: "#/components/schemas/TestQuestion" } }
 *         createdBy: { type: object }
 *         createdAt: { type: string }
 *         updatedAt: { type: string }
 */

/**
 * @swagger
 * /api/tests/upload-url:
 *   post:
 *     summary: Get presigned S3 upload URL for test banner
 *     tags: [Tests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bannerType]
 *             properties:
 *               bannerType: { type: string, example: "image/jpeg" }
 *     responses:
 *       200: { description: Upload URL generated }
 *       401: { description: Not authorized }
 */
router.post("/upload-url", getBannerUploadUrl);

/**
 * @swagger
 * /api/tests:
 *   post:
 *     summary: Create test (startTime only; endTime auto-computed from per-question time and questions count)
 *     tags: [Tests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startTime]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               bannerKey: { type: string }
 *               startTime: { type: string, format: date-time }
 *               perQuestionMinutes: { type: number }
 *               perQuestionSeconds: { type: number }
 *               questions: { type: array, items: { $ref: "#/components/schemas/TestQuestion" } }
 *     responses:
 *       201: { description: Test created }
 *       400: { description: Validation error }
 *       401: { description: Not authorized }
 */
router.post("/", createTestValidator, validate, createTest);

/**
 * @swagger
 * /api/tests:
 *   get:
 *     summary: Get all tests of logged-in teacher (paginated, searchable)
 *     tags: [Tests]
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
 *         schema: { type: string, enum: [createdAt, title, startTime, endTime] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200: { description: Tests fetched successfully }
 *       401: { description: Not authorized }
 */
router.get("/", getTestsQueryValidator, validate, getMyTests);

/**
 * @swagger
 * /api/tests/{id}:
 *   get:
 *     summary: Get single test by ID
 *     tags: [Tests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Test details }
 *       404: { description: Test not found }
 */
router.get("/:id", testIdValidator, validate, getTestById);

/**
 * @swagger
 * /api/tests/{id}:
 *   put:
 *     summary: Update test
 *     tags: [Tests]
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
 *               bannerKey: { type: string }
 *               startTime: { type: string, format: date-time }
 *               perQuestionMinutes: { type: number }
 *               perQuestionSeconds: { type: number }
 *               questions: { type: array }
 *     responses:
 *       200: { description: Test updated }
 *       404: { description: Test not found }
 */
router.put("/:id", updateTestValidator, validate, updateTest);

/**
 * @swagger
 * /api/tests/{id}:
 *   delete:
 *     summary: Delete test (removes banner from S3 and document)
 *     tags: [Tests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Test deleted }
 *       404: { description: Test not found }
 */
router.delete("/:id", testIdValidator, validate, deleteTest);

/**
 * @swagger
 * /api/tests/{id}/announce:
 *   post:
 *     summary: Send a custom announcement to this test's notification subscribers
 *     tags: [Tests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200: { description: Announcement sent }
 *       404: { description: Test not found }
 */
router.post("/:id/announce", testIdValidator, validate, announceToTestSubscribers);

module.exports = router;
