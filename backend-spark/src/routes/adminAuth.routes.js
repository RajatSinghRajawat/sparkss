const express = require("express");
const router = express.Router();
const { login, getMe } = require("../controllers/adminAuth.controller");
const { loginValidator } = require("../validators/adminAuth.validator");
const validate = require("../middlewares/validate");
const { protectAdmin } = require("../middlewares/adminAuth.middleware");

// POST /api/admin/auth/login
router.post("/login", loginValidator, validate, login);

// GET /api/admin/auth/me (protected, IP-bound token)
router.get("/me", protectAdmin, getMe);

module.exports = router;
