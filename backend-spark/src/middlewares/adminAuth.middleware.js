const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const { getClientIp } = require("../utils/getClientIp");

/**
 * Protect admin routes – verify JWT and bind token to same IP.
 * If request comes from a different IP than at login, token is invalid (expire effect).
 * Attaches admin to req.user.
 */
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentIp = getClientIp(req);
    const tokenIp = decoded.ip;

    if (!tokenIp || tokenIp !== currentIp) {
      return res.status(401).json({
        success: false,
        message: "Token invalid for this device. Please login again from this device.",
      });
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Admin not found.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact support.",
      });
    }

    req.user = {
      id: admin._id,
      email: admin.email,
      name: admin.name,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authorization failed.",
    });
  }
};

module.exports = { protectAdmin };
