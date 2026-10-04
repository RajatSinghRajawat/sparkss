const mongoose = require("mongoose");
const Reel = require("../models/reel.model");
const ReelSave = require("../models/reelSave.model");
const ReelLike = require("../models/reelLike.model");
const Follow = require("../models/follow.model");
const { addPresignedUrlsToReels } = require("./reel.controller");

// ─────────────────────────────────────────────
// @desc    Toggle save on a reel (save / unsave)
// @route   POST /api/students/reels/:reelId/save
// @access  Private (Student)
// ─────────────────────────────────────────────
const toggleReelSave = async (req, res) => {
  try {
    const { reelId } = req.params;
    const studentId = req.user.id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const existingSave = await ReelSave.findOne({
      reel: reelId,
      savedBy: studentId,
    });

    if (existingSave) {
      await ReelSave.deleteOne({ _id: existingSave._id });
      return res.status(200).json({
        success: true,
        message: "Reel unsaved",
        data: {
          saved: false,
        },
      });
    }

    await ReelSave.create({
      reel: reelId,
      savedBy: studentId,
    });

    res.status(200).json({
      success: true,
      message: "Reel saved",
      data: {
        saved: true,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Already saved this reel",
      });
    }
    console.error("❌ Toggle Reel Save Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update save.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get save status for a reel (savedByMe)
// @route   GET /api/students/reels/:reelId/save
// @access  Private (Student)
// ─────────────────────────────────────────────
const getReelSaveStatus = async (req, res) => {
  try {
    const { reelId } = req.params;
    const studentId = req.user.id;

    const reel = await Reel.findById(reelId).select("_id");
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const savedByMe = await ReelSave.exists({
      reel: reelId,
      savedBy: studentId,
    });

    res.status(200).json({
      success: true,
      data: {
        savedByMe: !!savedByMe,
      },
    });
  } catch (error) {
    console.error("❌ Get Reel Save Status Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get save status.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// ─────────────────────────────
// @desc    Get all reels saved by the logged-in student (paginated)
// @route   GET /api/students/reels/saved
// @access  Private (Student)
// ─────────────────────────────
const getMySavedReels = async (req, res) => {
  try {
    const studentId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    // Newest save first — saved list is ordered by when the student saved it.
    const saveDocs = await ReelSave.find({ savedBy: studentId })
      .sort({ createdAt: -1 })
      .select("reel createdAt")
      .lean();

    const savedReelIdStrings = saveDocs.map((d) => d.reel?.toString()).filter(Boolean);

    if (savedReelIdStrings.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Saved reels fetched successfully",
        data: {
          reels: [],
          pagination: { total: 0, page, limit, totalPages: 0, hasMore: false },
        },
      });
    }

    // A reel can be deleted or deactivated after being saved — only keep live ones,
    // so the total/pagination matches what the student can actually watch.
    const liveReels = await Reel.find({
      _id: { $in: savedReelIdStrings },
      isActive: true,
    })
      .populate("category", "name")
      .populate("createdBy", "name email")
      .lean();

    const reelById = new Map(liveReels.map((r) => [r._id.toString(), r]));
    const orderedReels = savedReelIdStrings
      .map((id) => reelById.get(id))
      .filter(Boolean);

    const total = orderedReels.length;
    const totalPages = Math.ceil(total / limit);
    const pageReels = orderedReels.slice(skip, skip + limit);

    const reelsWithUrls = await addPresignedUrlsToReels(pageReels);

    const reelIds = pageReels.map((r) => r._id);
    const teacherIds = [
      ...new Set(
        pageReels
          .map((r) => {
            const cb = r.createdBy;
            if (!cb) return null;
            return (cb._id ?? cb).toString();
          })
          .filter(Boolean)
      ),
    ];

    const [likedDocs, followDocs, followerCounts] = await Promise.all([
      reelIds.length > 0
        ? ReelLike.find({ reel: { $in: reelIds }, likedBy: studentId }).select("reel").lean()
        : Promise.resolve([]),
      teacherIds.length > 0
        ? Follow.find({ teacher: { $in: teacherIds }, followedBy: studentId }).select("teacher").lean()
        : Promise.resolve([]),
      teacherIds.length > 0
        ? Follow.aggregate([
            {
              $match: {
                teacher: {
                  $in: teacherIds.map((id) => new mongoose.Types.ObjectId(id)),
                },
              },
            },
            { $group: { _id: "$teacher", count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ]);

    const likedReelIds = new Set(likedDocs.map((d) => d.reel.toString()));
    const followedTeacherIds = new Set(followDocs.map((d) => d.teacher.toString()));
    const teacherFollowersCountMap = {};
    followerCounts.forEach((c) => {
      teacherFollowersCountMap[c._id.toString()] = c.count;
    });

    // Same shape as GET /api/students/reels so the app can reuse the reel player.
    const reels = reelsWithUrls.map((reel) => {
      const teacherId = reel.createdBy?._id?.toString() ?? reel.createdBy?.toString();
      return {
        ...reel,
        totalViews: reel.views ?? 0,
        totalLikes: reel.likes ?? 0,
        isReelLike: likedReelIds.has(reel._id.toString()),
        isReelSave: true,
        isFollow: teacherId ? followedTeacherIds.has(teacherId) : false,
        teacherFollowersCount: teacherId ? (teacherFollowersCountMap[teacherId] ?? 0) : 0,
      };
    });

    res.status(200).json({
      success: true,
      message: "Saved reels fetched successfully",
      data: {
        reels,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get Saved Reels Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch saved reels.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = {
  toggleReelSave,
  getReelSaveStatus,
  getMySavedReels,
};
