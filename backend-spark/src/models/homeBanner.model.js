const mongoose = require("mongoose");

const homeBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    link: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Link cannot exceed 500 characters"],
    },
    image: {
      url: { type: String, required: true },
      key: { type: String, required: true, description: "S3 object key" },
    },
    order: {
      type: Number,
      default: 0,
      description: "Display order (lower first)",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

homeBannerSchema.index({ order: 1, createdAt: -1 });

const HomeBanner = mongoose.model("HomeBanner", homeBannerSchema);

module.exports = HomeBanner;
