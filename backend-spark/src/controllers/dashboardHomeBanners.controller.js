/**
 * Dashboard home page banners – admin only.
 * GET /api/admin/dashboard/home-banners – list all
 * POST /api/admin/dashboard/home-banners – create (body: title?, link?, imageKey, order?)
 * DELETE /api/admin/dashboard/home-banners/:bannerId – delete
 * POST /api/admin/dashboard/home-banners/upload-banner – upload image (multipart)
 */

const HomeBanner = require("../models/homeBanner.model");
const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getS3Client, getS3Bucket, getS3Url, getPresignedViewUrl } = require("../config/s3");

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Get all home banners (paginated, sorted by order then createdAt)
// @route   GET /api/admin/dashboard/home-banners
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getHomeBannerList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

    const [list, total] = await Promise.all([
      HomeBanner.find({})
        .sort({ order: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      HomeBanner.countDocuments({}),
    ]);

    // Use presigned URLs so images load when S3 bucket is private
    const data = await Promise.all(
      list.map(async (b) => {
        let imageUrl = "";
        if (b.image?.key) {
          try {
            imageUrl = (await getPresignedViewUrl(b.image.key, 3600)) || "";
          } catch (e) {
            imageUrl = getS3Url(b.image.key);
          }
        }
        return {
          _id: b._id.toString(),
          title: b.title || "",
          link: b.link || "",
          imageUrl,
          imageKey: b.image?.key || "",
          order: b.order ?? 0,
          isActive: !!b.isActive,
          createdAt: b.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        list: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard getHomeBannerList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load home banners.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Upload home banner image (multipart); returns key and fileUrl
// @route   POST /api/admin/dashboard/home-banners/upload-banner
// @access  Private (Admin)
// ─────────────────────────────────────────────
const uploadHomeBannerFile = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required.",
      });
    }
    const ext = MIME_TO_EXT[req.file.mimetype] || ".jpg";
    const key = `home/banners/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const s3Client = getS3Client();
    const bucket = getS3Bucket();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const fileUrl = getS3Url(key);
    res.status(200).json({
      success: true,
      message: "Banner uploaded",
      data: { banner: { key, fileUrl } },
    });
  } catch (error) {
    console.error("Dashboard uploadHomeBannerFile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to upload banner.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create home banner
// @route   POST /api/admin/dashboard/home-banners
// @access  Private (Admin)
// ─────────────────────────────────────────────
const createHomeBanner = async (req, res) => {
  try {
    const { title, link, imageKey, order } = req.body;
    if (!imageKey || typeof imageKey !== "string" || !imageKey.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required.",
      });
    }
    const key = imageKey.trim();
    const url = getS3Url(key);

    const banner = await HomeBanner.create({
      title: (title || "").trim(),
      link: (link || "").trim(),
      image: { url, key },
      order: typeof order === "number" ? order : parseInt(order, 10) || 0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Home banner created.",
      data: {
        _id: banner._id.toString(),
        title: banner.title || "",
        link: banner.link || "",
        imageUrl: banner.image?.url,
        imageKey: banner.image?.key,
        order: banner.order,
        isActive: banner.isActive,
        createdAt: banner.createdAt,
      },
    });
  } catch (error) {
    console.error("Dashboard createHomeBanner Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create home banner.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete home banner by ID
// @route   DELETE /api/admin/dashboard/home-banners/:bannerId
// @access  Private (Admin)
// ─────────────────────────────────────────────
const deleteHomeBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const banner = await HomeBanner.findByIdAndDelete(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Home banner deleted.",
    });
  } catch (error) {
    console.error("Dashboard deleteHomeBanner Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete home banner.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getHomeBannerList,
  uploadHomeBannerFile,
  createHomeBanner,
  deleteHomeBanner,
};
