const Category = require("../models/category.model");
const { escapeRegex } = require("../utils/escapeRegex");

// ─────────────────────────────────────────────
// @desc    Create a new category
// @route   POST /api/categories
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const teacherId = req.user.id;

    // Check if this teacher already has a category with the same name
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") }, // Case-insensitive check
      createdBy: teacherId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have a category with this name",
      });
    }

    const category = await Category.create({
      name,
      createdBy: teacherId,
    });

    // Populate teacher info
    await category.populate("createdBy", "name email");

    console.log(`📁 Category created: "${name}" by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category },
    });
  } catch (error) {
    console.error("❌ Create Category Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already have a category with this name",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create category. Please try again.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get all categories of logged-in teacher
// @route   GET /api/categories
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getMyCategories = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const categories = await Category.find({ createdBy: teacherId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 }); // Newest first

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: {
        count: categories.length,
        categories,
      },
    });
  } catch (error) {
    console.error("❌ Get Categories Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Private (Teacher)
// ─────────────────────────────────────────────
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    }).populate("createdBy", "name email");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    console.error("❌ Get Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const teacherId = req.user.id;

    // Find category owned by this teacher
    const category = await Category.findOne({
      _id: req.params.id,
      createdBy: teacherId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found or you don't have permission",
      });
    }

    // Check for duplicate name (case-insensitive)
    const duplicate = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      createdBy: teacherId,
      _id: { $ne: req.params.id }, // Exclude current category
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "You already have another category with this name",
      });
    }

    category.name = name;
    await category.save();

    await category.populate("createdBy", "name email");

    console.log(`✏️ Category updated: "${name}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category },
    });
  } catch (error) {
    console.error("❌ Update Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update category.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Teacher - owner only)
// ─────────────────────────────────────────────
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found or you don't have permission",
      });
    }

    console.log(`🗑️ Category deleted: "${category.name}" by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: { category },
    });
  } catch (error) {
    console.error("❌ Delete Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete category.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  createCategory,
  getMyCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};

