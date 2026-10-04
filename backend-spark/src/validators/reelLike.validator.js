const { param } = require("express-validator");

// ─── Reel ID param (for like routes: /reels/:reelId/like) ───
const reelIdParamValidator = [
  param("reelId")
    .trim()
    .notEmpty()
    .withMessage("Reel ID is required")
    .isMongoId()
    .withMessage("Invalid reel ID"),
];

module.exports = {
  reelIdParamValidator,
};
