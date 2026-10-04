const jwt = require("jsonwebtoken");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");

/**
 * Protect routes - Verify JWT token (Teacher)
 * Attaches teacher to req.user
 */
const protect = async (req, res, next) => {
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

    const teacher = await Teacher.findById(decoded.id);

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Teacher not found.",
      });
    }

    if (!teacher.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact admin.",
      });
    }

    req.user = {
      id: teacher._id,
      email: teacher.email,
      name: teacher.name,
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

/**
 * Protect routes - Verify JWT token (Student)
 * Attaches student to req.user
 */
const protectStudent = async (req, res, next) => {
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

    const student = await Student.findById(decoded.id);

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Student not found.",
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact support.",
      });
    }

    req.user = {
      id: student._id,
      email: student.email,
      name: student.name,
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

module.exports = { protect, protectStudent };

