const Admin = require("../models/admin.model");
const jwt = require("jsonwebtoken");
const { getClientIp } = require("../utils/getClientIp");

const ADMIN_TOKEN_EXPIRE = "1d"; // 24 hours

// ─────────────────────────────────────────────
// @desc    Admin Login (token 1 day, IP-bound)
// @route   POST /api/admin/auth/login
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);

    const admin = await Admin.findOne({ email: email?.toLowerCase?.()?.trim() }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact support.",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        ip: clientIp,
      },
      process.env.JWT_SECRET,
      { expiresIn: ADMIN_TOKEN_EXPIRE }
    );

    console.log(`🔑 Admin logged in: ${admin.email} from IP ${clientIp}`);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
        },
        token,
        expiresIn: ADMIN_TOKEN_EXPIRE,
      },
    });
  } catch (error) {
    console.error("❌ Admin Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get current admin (protected, IP-checked by middleware)
// @route   GET /api/admin/auth/me
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("name email isActive createdAt");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { admin },
    });
  } catch (error) {
    console.error("❌ Admin GetMe Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin profile.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { login, getMe };
