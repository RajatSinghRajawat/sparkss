const Teacher = require("../models/teacher.model");
const OTP = require("../models/otp.model");
const { generateUploadUrl } = require("../helpers/fileHelper");
const { getS3Url, signStoredUrl } = require("../config/s3");
const Follow = require("../models/follow.model");
const Reel = require("../models/reel.model");
const ReelView = require("../models/reelView.model");
const Playlist = require("../models/playlist.model");
const Course = require("../models/course.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const { generateOTP } = require("../utils/otp.utils");
const { sendOTPEmail } = require("../services/email.service");
const jwt = require("jsonwebtoken");

// ─── Helper: is this email / phone already taken? ───
// Admin "Deactivate" keeps the account (and its unique email/phone), so say
// so explicitly — a bare "already registered" looked like a bug when the
// teacher had switched to a new email but kept the old number.
const findRegistrationConflict = async ({ email, phone }) => {
  if (email) {
    const byEmail = await Teacher.findOne({ email }).select("isActive").lean();
    if (byEmail) {
      return byEmail.isActive === false
        ? "This email belongs to a deactivated teacher account. Contact support to reactivate it, or use a different email."
        : "A teacher with this email is already registered";
    }
  }
  // Guard: findOne({ phone: undefined }) would match any teacher.
  if (phone) {
    const byPhone = await Teacher.findOne({ phone }).select("isActive").lean();
    if (byPhone) {
      return byPhone.isActive === false
        ? "This phone number belongs to a deactivated teacher account. Contact support to reactivate it, or use a different number."
        : "A teacher with this phone number is already registered";
    }
  }
  return null;
};

// ─────────────────────────────────────────────
// @desc    Send OTP to teacher's email
// @route   POST /api/auth/send-otp
// @access  Public
// ─────────────────────────────────────────────
const sendOTP = async (req, res) => {
  try {
    const { email, phone } = req.body;

    // Check email and (when sent) phone before mailing an OTP — otherwise a
    // taken phone only failed after the teacher had entered the code.
    const conflict = await findRegistrationConflict({ email, phone });
    if (conflict) {
      return res.status(409).json({ success: false, message: conflict });
    }

    // Delete any existing OTPs for this email (prevent multiple active OTPs)
    await OTP.deleteMany({ email, purpose: "register" });

    // Generate new OTP
    const otp = generateOTP(6);

    // Save OTP to database
    await OTP.create({
      email,
      otp,
      purpose: "register",
    });

    // Send OTP via email
    await sendOTPEmail(email, otp, "register");

    console.log(`📩 OTP sent to ${email} for registration`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      data: {
        email,
        expiresIn: "5 minutes",
      },
    });
  } catch (error) {
    console.error("❌ Send OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Verify OTP & Register Teacher
// @route   POST /api/auth/verify-otp
// @access  Public
// ─────────────────────────────────────────────
const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, otp, name, phone, password } = req.body;

    const conflict = await findRegistrationConflict({ email, phone });
    if (conflict) {
      return res.status(409).json({ success: false, message: conflict });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email, purpose: "register" });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or not found. Please request a new OTP.",
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempt count
      otpRecord.attempts += 1;
      await otpRecord.save();

      const remainingAttempts = 5 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    // OTP is valid — Create teacher
    const teacher = await Teacher.create({
      name,
      email,
      phone,
      password,
      isVerified: true,
    });

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign(
      { id: teacher._id, email: teacher.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    console.log(`✅ Teacher registered: ${name} (${email})`);

    res.status(201).json({
      success: true,
      message: "Registration successful! Welcome to Sparks 🎉",
      data: {
        teacher: {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          isVerified: teacher.isVerified,
          createdAt: teacher.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ Verify OTP Error:", error.message);

    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `A teacher with this ${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Resend OTP to teacher's email
// @route   POST /api/auth/resend-otp
// @access  Public
// ─────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(409).json({
        success: false,
        message: "A teacher with this email is already registered",
      });
    }

    // Delete old OTPs
    await OTP.deleteMany({ email, purpose: "register" });

    // Generate new OTP
    const otp = generateOTP(6);

    // Save OTP
    await OTP.create({
      email,
      otp,
      purpose: "register",
    });

    // Send OTP email
    await sendOTPEmail(email, otp, "register");

    console.log(`🔄 OTP resent to ${email}`);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully to your email",
      data: {
        email,
        expiresIn: "5 minutes",
      },
    });
  } catch (error) {
    console.error("❌ Resend OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Login Teacher
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find teacher with password field included
    const teacher = await Teacher.findOne({ email }).select("+password");

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (!teacher.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    // Compare password
    const isMatch = await teacher.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: teacher._id, email: teacher.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    console.log(`🔑 Teacher logged in: ${teacher.name} (${email})`);

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        teacher: {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          avatar: await signStoredUrl(teacher.avatar),
          isVerified: teacher.isVerified,
          createdAt: teacher.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get current teacher profile (with stats: totalCourses, totalEnrolledStudents, totalFollowers, totalReelsViews)
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacher = await Teacher.findById(teacherId)
      .select("name email phone avatar isVerified createdAt")
      .lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const [teacherPlaylists, teacherReels] = await Promise.all([
      Playlist.find({ createdBy: teacherId }).select("_id").lean(),
      Reel.find({ createdBy: teacherId, isActive: true }).select("_id").lean(),
    ]);
    const playlistIds = teacherPlaylists.map((p) => p._id);
    const reelIds = teacherReels.map((r) => r._id);

    const [totalFollowers, totalCourses, totalEnrolledStudents, totalReelsViews] =
      await Promise.all([
        Follow.countDocuments({ teacher: teacherId }),
        Course.countDocuments({ createdBy: teacherId, isActive: true }),
        playlistIds.length
          ? PlaylistEnrollment.countDocuments({ playlist: { $in: playlistIds } })
          : 0,
        reelIds.length
          ? ReelView.countDocuments({ reel: { $in: reelIds } })
          : 0,
      ]);

    const teacherProfile = {
      ...teacher,
      avatar: await signStoredUrl(teacher.avatar),
      totalCourses,
      totalEnrolledStudents,
      totalFollowers,
      totalReelsViews,
    };

    res.status(200).json({
      success: true,
      data: { teacher: teacherProfile },
    });
  } catch (error) {
    console.error("❌ Get Me Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get presigned URL for teacher avatar upload
// @route   POST /api/auth/avatar-upload-url
// @access  Private
// ─────────────────────────────────────────────
const getAvatarUploadUrl = async (req, res) => {
  try {
    const { avatarType } = req.body;
    if (!avatarType) {
      return res.status(400).json({
        success: false,
        message: "avatarType is required (e.g. image/jpeg)",
      });
    }
    const data = await generateUploadUrl("teachers/avatars", avatarType);
    res.status(200).json({
      success: true,
      message: "Upload URL generated",
      data: {
        uploadUrl: data.uploadUrl,
        key: data.key,
        fileUrl: data.fileUrl,
      },
    });
  } catch (error) {
    console.error("❌ Get Avatar Upload URL Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URL.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update current teacher profile (name, phone, avatar)
// @route   PATCH /api/auth/me
// @access  Private
// ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { name, phone, avatarKey } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (name !== undefined) teacher.name = name.trim();
    if (phone !== undefined) teacher.phone = phone.trim();
    if (avatarKey !== undefined && avatarKey !== "") {
      teacher.avatar = getS3Url(avatarKey);
    } else if (avatarKey === "") {
      teacher.avatar = null;
    }

    await teacher.save();

    const updated = await Teacher.findById(teacherId)
      .select("name email phone avatar isVerified createdAt")
      .lean();
    if (updated) updated.avatar = await signStoredUrl(updated.avatar);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { teacher: updated },
    });
  } catch (error) {
    console.error("❌ Update Profile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Change teacher password (current + new)
// @route   POST /api/auth/change-password
// @access  Private
// ─────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const teacher = await Teacher.findById(teacherId).select("+password");
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const isMatch = await teacher.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    teacher.password = newPassword;
    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Change Password Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to change password.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTPAndRegister,
  resendOTP,
  login,
  getMe,
  getAvatarUploadUrl,
  updateProfile,
  changePassword,
};

