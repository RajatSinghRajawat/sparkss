/**
 * Dashboard categories – admin only.
 * GET /api/admin/dashboard/categories?page&limit&search
 * POST /api/admin/dashboard/categories  → create (body: name, createdBy?)
 */

const Category = require("../models/category.model");
const Teacher = require("../models/teacher.model");
const { escapeRegex } = require("../utils/escapeRegex");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─────────────────────────────────────────────
// @desc    Get all categories with pagination and search
// @route   GET /api/admin/dashboard/categories
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getCategoryList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const search = (req.query.search || "").trim();

    const filter = {};
    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: "i" };
    }
    if (req.query.teacherId === "__admin__") {
      filter.createdByAdmin = req.user?.id;
      filter.createdBy = null;
    } else if (req.query.teacherId) {
      filter.createdBy = req.query.teacherId;
    }

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate("createdBy", "name email")
        .populate("createdByAdmin", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
    ]);

    const list = categories.map((c) => ({
      _id: c._id.toString(),
      name: c.name || "",
      teacherName: c.createdBy?.name ?? c.createdByAdmin?.name ?? "Admin",
      teacherEmail: c.createdBy?.email ?? c.createdByAdmin?.email ?? "—",
      ownerType: c.createdBy ? "teacher" : "admin",
      createdAt: c.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard getCategoryList Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load categories.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create category (admin or for selected teacher)
// @route   POST /api/admin/dashboard/categories
// @access  Private (Admin)
// ─────────────────────────────────────────────
const createCategory = async (req, res) => {
  try {
    const { name, createdBy: teacherId } = req.body;
    const adminId = req.user?.id;
    const nameTrimmed = name.trim();

    const categoryData = { name: nameTrimmed };

    if (teacherId) {
      const teacher = await Teacher.findById(teacherId).select("name email").lean();
      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: "Teacher not found.",
        });
      }
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(nameTrimmed)}$`, "i") },
        createdBy: teacherId,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "This teacher already has a category with this name.",
        });
      }
      categoryData.createdBy = teacherId;
      categoryData.createdByAdmin = null;
    } else {
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(nameTrimmed)}$`, "i") },
        createdByAdmin: adminId,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You already have a category with this name.",
        });
      }
      categoryData.createdBy = null;
      categoryData.createdByAdmin = adminId;
    }

    const category = await Category.create(categoryData);
    await category.populate("createdBy", "name email");
    await category.populate("createdByAdmin", "name email");

    const listItem = {
      _id: category._id.toString(),
      name: category.name,
      teacherName: category.createdBy?.name ?? category.createdByAdmin?.name ?? "Admin",
      teacherEmail: category.createdBy?.email ?? category.createdByAdmin?.email ?? "—",
      ownerType: category.createdBy ? "teacher" : "admin",
      createdAt: category.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category: listItem },
    });
  } catch (error) {
    console.error("Dashboard createCategory Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create category.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  getCategoryList,
  createCategory,
};
