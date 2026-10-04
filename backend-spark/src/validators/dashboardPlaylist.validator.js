const { body } = require("express-validator");

/**
 * Admin create playlist – name, description (optional), createdBy (teacherId) required.
 */
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

  body("createdBy")
    .optional()
    .isMongoId()
    .withMessage("Invalid teacher ID"),

  body("bannerKey")
    .optional()
    .isString()
    .withMessage("bannerKey must be a string"),
];

module.exports = {
  createPlaylistValidator,
};
