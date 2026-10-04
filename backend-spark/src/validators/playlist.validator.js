const { body, param, query } = require("express-validator");

// ─── Create Playlist Validator ───
const createPlaylistValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Playlist name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Playlist name must be between 2 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("bannerKey")
    .optional()
    .isString()
    .withMessage("Banner key must be a string"),
];

// ─── Update Playlist Validator ───
const updatePlaylistValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid playlist ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Playlist name must be between 2 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("bannerKey")
    .optional()
    .isString()
    .withMessage("Banner key must be a string"),
];

// ─── Playlist ID Validator ───
const playlistIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid playlist ID"),
];

// ─── Student playlist ID (param: playlistId) ───
const studentPlaylistIdValidator = [
  param("playlistId")
    .isMongoId()
    .withMessage("Invalid playlist ID"),
];

// ─── Get Playlists Query Validator (student) ───
const getStudentPlaylistsQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "name"])
    .withMessage("sortBy must be one of: createdAt, name"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("order must be asc or desc"),
];

module.exports = {
  createPlaylistValidator,
  updatePlaylistValidator,
  playlistIdValidator,
  studentPlaylistIdValidator,
  getStudentPlaylistsQueryValidator,
};

