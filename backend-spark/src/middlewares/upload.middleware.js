const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { getS3Client, getS3Bucket } = require("../config/s3");

// ─── Allowed MIME types ───
const VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/3gpp",
];

const IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// ─── File filter: validate file types ───
const reelFileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    if (VIDEO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid video format. Allowed: MP4, MOV, AVI, WebM, 3GPP"),
        false
      );
    }
  } else if (file.fieldname === "thumbnail") {
    if (IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid image format. Allowed: JPEG, PNG, WebP, GIF"),
        false
      );
    }
  } else {
    cb(new Error("Unexpected field"), false);
  }
};

// ─── Lazy-initialized multer instance (avoids crash at require-time) ───
let _uploadInstance = null;

const getUploadInstance = () => {
  if (!_uploadInstance) {
    const s3Client = getS3Client();
    const bucket = getS3Bucket();

    if (!bucket) {
      throw new Error(
        "❌ AWS S3 bucket not configured! Set AWS_S3_BUCKET (or AWS_BUCKET_NAME) in your .env file."
      );
    }

    const storage = multerS3({
      s3: s3Client,
      bucket: bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (req, file, cb) => {
        cb(null, {
          fieldName: file.fieldname,
          uploadedBy: req.user?.id || "unknown",
        });
      },
      key: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);

        if (file.fieldname === "video") {
          cb(null, `reels/videos/${uniqueSuffix}${ext}`);
        } else if (file.fieldname === "thumbnail") {
          cb(null, `reels/thumbnails/${uniqueSuffix}${ext}`);
        } else {
          cb(null, `reels/others/${uniqueSuffix}${ext}`);
        }
      },
    });

    _uploadInstance = multer({
      storage,
      fileFilter: reelFileFilter,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB max per file
      },
    });
  }
  return _uploadInstance;
};

// ─── Upload middleware: video (required) + thumbnail (optional) ───
const uploadReelFields = (req, res, next) => {
  try {
    const upload = getUploadInstance();
    const handler = upload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]);
    handler(req, res, next);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "File upload initialization failed.",
    });
  }
};

// ─── Multer Error Handler Middleware ───
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = "File upload error.";

    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        message = "File is too large. Maximum size is 100MB.";
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files uploaded.";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = `Unexpected file field: ${err.field}. Expected 'video' and 'thumbnail'.`;
        break;
      default:
        message = err.message;
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  }

  next();
};

// ─── Memory upload for admin playlist banner (avoids CORS: backend uploads to S3) ───
const BANNER_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const BANNER_MAX_SIZE = 5 * 1024 * 1024; // 5MB

const bannerMemoryStorage = multer.memoryStorage();
const uploadPlaylistBanner = multer({
  storage: bannerMemoryStorage,
  limits: { fileSize: BANNER_MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (BANNER_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid image format. Allowed: JPEG, PNG, WebP, GIF"), false);
    }
  },
}).single("banner");

// ─── Memory upload for admin reel (video required, thumbnail optional) ───
const REEL_VIDEO_MAX = 100 * 1024 * 1024; // 100MB
const REEL_THUMB_MAX = 5 * 1024 * 1024; // 5MB
const reelAdminFileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    if (VIDEO_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid video format. Allowed: MP4, MOV, AVI, WebM, 3GPP"), false);
  } else if (file.fieldname === "thumbnail") {
    if (IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid thumbnail format. Allowed: JPEG, PNG, WebP, GIF"), false);
  } else {
    cb(new Error("Unexpected field"), false);
  }
};
const reelAdminStorage = multer.memoryStorage();
const uploadReelMediaAdmin = multer({
  storage: reelAdminStorage,
  limits: { fileSize: REEL_VIDEO_MAX },
  fileFilter: reelAdminFileFilter,
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// ─── Course upload (same as reel: video + thumbnail, memory) ───
const uploadCourseMediaAdmin = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: REEL_VIDEO_MAX },
  fileFilter: reelAdminFileFilter,
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

module.exports = {
  uploadReelFields,
  uploadPlaylistBanner,
  uploadReelMediaAdmin,
  uploadCourseMediaAdmin,
  handleMulterError,
};
