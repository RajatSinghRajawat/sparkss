const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
      description: "Teacher owner; null when created by admin",
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      description: "Admin owner when category is created by admin for themselves",
    },
  },
  {
    timestamps: true,
  }
);

// ─── Unique category name per teacher ───
categorySchema.index({ name: 1, createdBy: 1 }, { unique: true, sparse: true });
// ─── Unique category name per admin ───
categorySchema.index({ name: 1, createdByAdmin: 1 }, { unique: true, sparse: true });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;

