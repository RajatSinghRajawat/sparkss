const Student = require("../models/student.model");
const StudentFcmToken = require("../models/studentFcmToken.model");
const OTP = require("../models/otp.model");
const DeleteStudentRequest = require("../models/deleteStudentRequest.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const Result = require("../models/result.model");
const { generateOTP } = require("../utils/otp.utils");
const { sendOTPEmail } = require("../services/email.service");
const { generateUploadUrl } = require("../helpers/fileHelper");
const { getS3Url, getKeyFromS3Url, getPresignedViewUrl } = require("../config/s3");
const jwt = require("jsonwebtoken");

const OTP_PURPOSE = "student_register";

// ─────────────────────────────────────────────
// @desc    Send OTP to student's email
// @route   POST /api/students/send-otp
// @access  Public
// ─────────────────────────────────────────────
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A student with this email is already registered",
      });
    }

    await OTP.deleteMany({ email, purpose: OTP_PURPOSE });

    const otp = generateOTP(6);
    await OTP.create({
      email,
      otp,
      purpose: OTP_PURPOSE,
    });

    await sendOTPEmail(email, otp, OTP_PURPOSE);

    console.log(`📩 OTP sent to ${email} for student registration`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      data: {
        email,
        expiresIn: "5 minutes",
      },
    });
  } catch (error) {
    console.error("❌ Student Send OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Verify OTP & Register Student (name + password)
// @route   POST /api/students/verify-otp
// @access  Public
// ─────────────────────────────────────────────
const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A student with this email is already registered",
      });
    }

    const otpRecord = await OTP.findOne({ email, purpose: OTP_PURPOSE });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or not found. Please request a new OTP.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remainingAttempts = 5 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    const student = await Student.create({
      name,
      email,
      password,
      isVerified: true,
    });

    await OTP.deleteOne({ _id: otpRecord._id });

    const { fcmToken: regFcmToken, deviceLabel: regDeviceLabel } = req.body;
    if (regFcmToken) {
      await saveFcmTokenForStudent(student._id, regFcmToken, regDeviceLabel);
    }

    const token = jwt.sign(
      { id: student._id, email: student.email, type: "student" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    console.log(`✅ Student registered: ${name} (${email})`);

    res.status(201).json({
      success: true,
      message: "Registration successful! Welcome to Sparks 🎉",
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          isVerified: student.isVerified,
          createdAt: student.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ Student Verify OTP Error:", error.message);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `A student with this ${field} already exists`,
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
// @desc    Resend OTP to student's email
// @route   POST /api/students/resend-otp
// @access  Public
// ─────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A student with this email is already registered",
      });
    }

    await OTP.deleteMany({ email, purpose: OTP_PURPOSE });

    const otp = generateOTP(6);
    await OTP.create({
      email,
      otp,
      purpose: OTP_PURPOSE,
    });

    await sendOTPEmail(email, otp, OTP_PURPOSE);

    console.log(`🔄 OTP resent to ${email} (student)`);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully to your email",
      data: {
        email,
        expiresIn: "5 minutes",
      },
    });
  } catch (error) {
    console.error("❌ Student Resend OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─── Helper: save FCM token for a student (idempotent upsert) ───
const saveFcmTokenForStudent = async (studentId, fcmToken, deviceLabel = null) => {
  if (!studentId || !fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length < 10) return;
  await StudentFcmToken.findOneAndUpdate(
    { student: studentId, fcmToken: fcmToken.trim() },
    { $set: { student: studentId, fcmToken: fcmToken.trim(), deviceLabel: deviceLabel || null } },
    { upsert: true, new: true }
  );
};

// ─────────────────────────────────────────────
// @desc    Login Student
// @route   POST /api/students/login
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password, fcmToken, deviceLabel } = req.body;

    const student = await Student.findOne({ email }).select("+password");

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (fcmToken) {
      await saveFcmTokenForStudent(student._id, fcmToken, deviceLabel);
    }

    const token = jwt.sign(
      { id: student._id, email: student.email, type: "student" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    console.log(`🔑 Student logged in: ${student.name} (${email})`);

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          isVerified: student.isVerified,
          createdAt: student.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ Student Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get current student profile
// @route   GET /api/students/me
// @access  Private (Student)
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { student },
    });
  } catch (error) {
    console.error("❌ Student Get Me Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get student profile data (image, name, email, enrolled count, avg score, completed tests)
// @route   GET /api/students/profile
// @access  Private (Student)
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findById(studentId).select("name email phone avatar");
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const [enrolledCourseCount, completedResults] = await Promise.all([
      PlaylistEnrollment.countDocuments({ student: studentId }),
      Result.find({ student: studentId, completedAt: { $ne: null } }).select("answers"),
    ]);

    let avgTestScore = 0;
    const completedTestCount = completedResults.length;
    if (completedTestCount > 0) {
      const totalScore = completedResults.reduce((sum, result) => {
        const answers = result.answers || [];
        if (answers.length === 0) return sum;
        const correct = answers.filter((a) => a.isCorrect).length;
        const score = (correct / answers.length) * 100;
        return sum + score;
      }, 0);
      avgTestScore = Math.round((totalScore / completedTestCount) * 100) / 100;
    }

    // Return presigned view URL for avatar so app can load image (bucket may be private)
    let imageUrl = null;
    if (student.avatar) {
      const avatarKey = getKeyFromS3Url(student.avatar);
      imageUrl = avatarKey ? await getPresignedViewUrl(avatarKey, 3600) : student.avatar;
    }

    res.status(200).json({
      success: true,
      data: {
        image: imageUrl,
        name: student.name,
        email: student.email,
        phone: student.phone || null,
        enrolledCourseCount,
        avgTestScore,
        completedTestCount,
      },
    });
  } catch (error) {
    console.error("❌ Student Get Profile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get presigned URL for student avatar upload
// @route   POST /api/students/avatar-upload-url
// @access  Private (Student)
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
    const data = await generateUploadUrl("students/avatars", avatarType);
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
    console.error("❌ Student Get Avatar Upload URL Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URL.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update current student profile (name, phone, avatar)
// @route   PATCH /api/students/me
// @access  Private (Student)
// ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { name, phone, avatarKey } = req.body;

    console.log("updateProfile", req.body);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (name !== undefined) student.name = name.trim();
    if (phone !== undefined) {
      const trimmed = phone.trim();
      if (trimmed === "") {
        student.phone = null;
      } else {
        const existing = await Student.findOne({
          phone: trimmed,
          _id: { $ne: studentId },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: "This phone number is already used by another account",
          });
        }
        student.phone = trimmed;
      }
    }
    if (avatarKey !== undefined && avatarKey !== "") {
      student.avatar = getS3Url(avatarKey);
    } else if (avatarKey === "") {
      student.avatar = null;
    }

    await student.save();

    const updated = await Student.findById(studentId)
      .select("name email phone avatar isVerified createdAt")
      .lean();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { student: updated },
    });
  } catch (error) {
    console.error("❌ Student Update Profile Error:", error.message);
    if (error.code === 11000 && error.keyPattern?.phone) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already used by another account",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Change student password (current + new)
// @route   POST /api/students/change-password
// @access  Private (Student)
// ─────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const student = await Student.findById(studentId).select("+password");
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const isMatch = await student.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    student.password = newPassword;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Student Change Password Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to change password.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Request account deletion (soft delete: deactivate + store request)
// @route   POST /api/students/delete-account
// @access  Private (Student)
// ─────────────────────────────────────────────
const requestDeleteAccount = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { email, message } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const emailMatch = student.email.toLowerCase().trim() === String(email).toLowerCase().trim();
    if (!emailMatch) {
      return res.status(400).json({
        success: false,
        message: "Email does not match your account",
      });
    }

    await DeleteStudentRequest.create({
      student: studentId,
      email: student.email,
      message: message.trim(),
      status: "pending",
    });

    student.isActive = false;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Your account has been deactivated. We have recorded your request.",
    });
  } catch (error) {
    console.error("❌ Student Request Delete Account Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to process request.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Save or update FCM token for current student (after login / on app open)
// @route   POST /api/students/fcm-token
// @access  Private (Student)
// ─────────────────────────────────────────────
const saveFcmToken = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { fcmToken, deviceLabel } = req.body;

    if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Valid fcmToken is required (at least 10 characters)",
      });
    }

    await StudentFcmToken.findOneAndUpdate(
      { student: studentId, fcmToken: fcmToken.trim() },
      { $set: { student: studentId, fcmToken: fcmToken.trim(), deviceLabel: deviceLabel || null } },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    console.error("❌ Student Save FCM Token Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save FCM token.",
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
  getProfile,
  getAvatarUploadUrl,
  updateProfile,
  changePassword,
  requestDeleteAccount,
  saveFcmToken,
};
