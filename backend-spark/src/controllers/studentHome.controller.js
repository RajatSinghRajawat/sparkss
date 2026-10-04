/**
 * Student app home page – single API for banners, top courses, reels, long videos.
 * GET /api/students/home
 * @access  Private (Student)
 */

const HomeBanner = require("../models/homeBanner.model");
const Playlist = require("../models/playlist.model");
const Course = require("../models/course.model");
const Reel = require("../models/reel.model");
const Teacher = require("../models/teacher.model");
const PlaylistEnrollment = require("../models/playlistEnrollment.model");
const Follow = require("../models/follow.model");
const CourseRating = require("../models/courseRating.model");
const { getPresignedViewUrl, signStoredUrl } = require("../config/s3");
const mongoose = require("mongoose");
const { escapeRegex } = require("../utils/escapeRegex");
const { hideLockedVideoUrls } = require("../utils/courseAccess");

const LIMIT_BANNERS = 20;
const LIMIT_TOP_TEACHERS = 5;
const LIMIT_TOP_COURSES = 5;
const LIMIT_TOP_REELS = 5;
const LIMIT_TOP_LONG_VIDEOS = 5;
const MIN_LIKE_RATIO = 0.02; // 2% likes of views
const LIMIT_SEARCH_PER_TYPE = 10; // max results per type (teachers, reels, courses, playlists)

// ─── Helper: Add presigned URL to home banner image ───
const addBannerImageUrl = async (banner) => {
  const obj = banner.toJSON ? banner.toJSON() : { ...banner };
  if (obj.image?.key) {
    try {
      obj.imageUrl = await getPresignedViewUrl(obj.image.key, 3600);
    } catch (e) {
      obj.imageUrl = obj.image?.url || "";
    }
  } else {
    obj.imageUrl = obj.image?.url || "";
  }
  return {
    _id: (obj._id && obj._id.toString) ? obj._id.toString() : String(obj._id),
    title: obj.title || "",
    link: obj.link || "",
    imageUrl: obj.imageUrl || "",
    order: obj.order ?? 0,
  };
};

// ─── Helper: Add presigned banner URL to playlist (same as playlist controller) ───
const addPresignedBannerUrl = async (playlist) => {
  const obj = playlist.toJSON ? playlist.toJSON() : { ...playlist };
  if (obj.banner?.key) {
    try {
      obj.banner = { ...obj.banner, url: await getPresignedViewUrl(obj.banner.key, 3600) };
    } catch (e) {
      // keep existing url if any
    }
  }
  if (obj.createdBy?.avatar) {
    obj.createdBy = { ...obj.createdBy, avatar: await signStoredUrl(obj.createdBy.avatar) };
  }
  return obj;
};

// ─── Helper: Add presigned URLs to course (video + thumbnail) ───
const addPresignedCourseUrls = async (course) => {
  const obj = course.toJSON ? course.toJSON() : { ...course };
  if (obj.video?.key) {
    try {
      obj.video = { ...obj.video, url: await getPresignedViewUrl(obj.video.key, 3600) };
    } catch (e) {}
  }
  if (obj.thumbnail?.key) {
    try {
      obj.thumbnail = { ...obj.thumbnail, url: await getPresignedViewUrl(obj.thumbnail.key, 3600) };
    } catch (e) {}
  }
  return obj;
};

// ─── Helper: Add presigned URLs to reel (video + thumbnail) ───
const addPresignedReelUrls = async (reel) => {
  const obj = reel.toJSON ? reel.toJSON() : { ...reel };
  if (obj.video?.key) {
    try {
      obj.video = { ...obj.video, url: await getPresignedViewUrl(obj.video.key, 3600) };
    } catch (e) {}
  }
  if (obj.thumbnail?.key) {
    try {
      obj.thumbnail = { ...obj.thumbnail, url: await getPresignedViewUrl(obj.thumbnail.key, 3600) };
    } catch (e) {}
  }
  // No thumbnail → leave url null. Clients render a frame from video.url
  // themselves; an .mp4 URL in thumbnail.url just made <Image> load nothing.
  return obj;
};

const getStudentHome = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    // ─── 1. Home banners (active, by order) ───
    const bannerDocs = await HomeBanner.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .limit(LIMIT_BANNERS)
      .lean();
    const banners = await Promise.all(bannerDocs.map((b) => addBannerImageUrl(b)));

    // ─── 2. Top 5 teachers (by followers + total reel views) ───
    const [followersAgg, reelViewsAgg] = await Promise.all([
      Follow.aggregate([
        { $group: { _id: "$teacher", followersCount: { $sum: 1 } } },
      ]),
      Reel.aggregate([
        { $match: { createdBy: { $ne: null }, isActive: true } },
        { $group: { _id: "$createdBy", totalReelViews: { $sum: "$views" } } },
      ]),
    ]);
    const followersMap = {};
    followersAgg.forEach((r) => {
      const id = r._id?.toString?.();
      if (id) followersMap[id] = r.followersCount || 0;
    });
    const reelViewsMap = {};
    reelViewsAgg.forEach((r) => {
      const id = r._id?.toString?.();
      if (id) reelViewsMap[id] = r.totalReelViews || 0;
    });
    const allTeacherIds = new Set([
      ...Object.keys(followersMap),
      ...Object.keys(reelViewsMap),
    ]);
    const teacherScores = Array.from(allTeacherIds).map((teacherId) => ({
      teacherId,
      score: (followersMap[teacherId] || 0) + (reelViewsMap[teacherId] || 0),
      followersCount: followersMap[teacherId] || 0,
      totalReelViews: reelViewsMap[teacherId] || 0,
    }));
    teacherScores.sort((a, b) => b.score - a.score);
    const topTeacherIds = teacherScores.slice(0, LIMIT_TOP_TEACHERS).map((t) => t.teacherId);
    let topTeachers = [];
    if (topTeacherIds.length > 0) {
      const teacherDocs = await Teacher.find({ _id: { $in: topTeacherIds } })
        .select("name avatar")
        .lean();
      const byId = {};
      teacherDocs.forEach((t) => {
        byId[t._id.toString()] = t;
      });
      const scoreById = {};
      teacherScores.slice(0, LIMIT_TOP_TEACHERS).forEach((t) => {
        scoreById[t.teacherId] = { followersCount: t.followersCount, totalReelViews: t.totalReelViews };
      });
      topTeachers = await Promise.all(topTeacherIds.map(async (id) => {
        const t = byId[id];
        const stats = scoreById[id] || { followersCount: 0, totalReelViews: 0 };
        return {
          _id: id,
          name: t?.name ?? "—",
          avatar: await signStoredUrl(t?.avatar),
          followersCount: stats.followersCount,
          totalReelViews: stats.totalReelViews,
        };
      }));
    }

    // ─── 3. Top 5 playlists by enrollment count ───
    const enrollmentAgg = await PlaylistEnrollment.aggregate([
      { $group: { _id: "$playlist", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: LIMIT_TOP_COURSES },
    ]);
    const topPlaylistIds = enrollmentAgg.map((e) => e._id).filter(Boolean);
    let topPlaylists = [];
    if (topPlaylistIds.length > 0) {
      const playlistDocs = await Playlist.find({
        _id: { $in: topPlaylistIds },
        isActive: true,
      })
        .populate("createdBy", "name email avatar")
        .lean();
      const orderMap = {};
      topPlaylistIds.forEach((id, i) => {
        orderMap[id.toString()] = i;
      });
      const withCounts = await Promise.all(
        playlistDocs.map(async (p) => {
          const id = p._id.toString();
          const enc = enrollmentAgg.find((e) => e._id.toString() === id);
          const videoCount = await Course.countDocuments({ playlist: p._id, isActive: true });
          const pl = await addPresignedBannerUrl(p);
          return {
            ...pl,
            _id: id,
            videoCount,
            enrollmentsCount: enc ? enc.count : 0,
          };
        })
      );
      topPlaylists = withCounts.sort(
        (a, b) => (orderMap[a._id] ?? 99) - (orderMap[b._id] ?? 99)
      );
    }

    // ─── 4. Top 5 reels: views > 0 and like ratio >= 2%; if < 5, fill with reels from most-followed teachers ───
    const allReelsWithViews = await Reel.find({
      isActive: true,
      views: { $gt: 0 },
    })
      .populate("category", "name")
      .populate("createdBy", "name email")
      .sort({ views: -1 })
      .limit(50)
      .lean();
    const reelsGoodRatio = allReelsWithViews.filter((r) => {
      const v = r.views || 0;
      const l = r.likes || 0;
      return v > 0 && l / v >= MIN_LIKE_RATIO;
    });
    let topReels = reelsGoodRatio.slice(0, LIMIT_TOP_REELS);
    const usedReelIds = new Set(topReels.map((r) => r._id.toString()));

    if (topReels.length < LIMIT_TOP_REELS) {
      const followDocs = await Follow.find({ followedBy: studentId }).select("teacher").lean();
      const followedTeacherIds = followDocs.map((d) => d.teacher.toString());
      if (followedTeacherIds.length > 0) {
        const fillReels = await Reel.find({
          isActive: true,
          _id: { $nin: Array.from(usedReelIds).map((id) => new mongoose.Types.ObjectId(id)) },
          createdBy: { $in: followedTeacherIds },
        })
          .populate("category", "name")
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .limit(LIMIT_TOP_REELS - topReels.length)
          .lean();
        topReels = [...topReels, ...fillReels];
        fillReels.forEach((r) => usedReelIds.add(r._id.toString()));
      }
    }
    if (topReels.length < LIMIT_TOP_REELS) {
      const remaining = await Reel.find({
        isActive: true,
        _id: { $nin: Array.from(usedReelIds).map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .populate("category", "name")
        .populate("createdBy", "name email")
        .sort({ views: -1, createdAt: -1 })
        .limit(LIMIT_TOP_REELS - topReels.length)
        .lean();
      topReels = [...topReels, ...remaining];
    }
    const topReelsWithUrls = await Promise.all(topReels.map((r) => addPresignedReelUrls(r)));
    const topReelsFormatted = topReelsWithUrls.map((r) => ({
      ...r,
      _id: r._id.toString(),
      category: r.category ? { _id: r.category._id?.toString(), name: r.category.name } : null,
      createdBy: r.createdBy
        ? {
            _id: r.createdBy._id?.toString?.() ?? r.createdBy?.toString?.(),
            name: r.createdBy.name,
            email: r.createdBy.email,
          }
        : null,
      thumbnail: r.thumbnail
        ? { url: r.thumbnail.url || null, key: r.thumbnail.key || null }
        : { url: null, key: null },
    }));

    // ─── 5. Top 5 long videos (courses): from most-followed teachers ───
    const teacherFollowerAgg = await Follow.aggregate([
      { $group: { _id: "$teacher", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    const teacherIdsByFollowers = teacherFollowerAgg.map((t) => t._id);
    let topLongVideos = [];
    if (teacherIdsByFollowers.length > 0) {
      const courseDocs = await Course.find({
        createdBy: { $in: teacherIdsByFollowers },
        isActive: true,
      })
        .populate("playlist", "name")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(LIMIT_TOP_LONG_VIDEOS)
        .lean();
      topLongVideos = await hideLockedVideoUrls(
        await Promise.all(courseDocs.map((c) => addPresignedCourseUrls(c))),
        studentId
      );
      topLongVideos = topLongVideos.map((c) => ({
        ...c,
        _id: c._id.toString(),
        playlist: c.playlist ? { _id: c.playlist._id.toString(), name: c.playlist.name } : null,
        createdBy: c.createdBy
          ? {
              _id: c.createdBy._id?.toString?.() ?? c.createdBy?.toString?.(),
              name: c.createdBy.name,
              email: c.createdBy.email,
            }
          : null,
      }));
    }

    res.status(200).json({
      success: true,
      message: "Home data fetched",
      data: {
        banners,
        topTeachers,
        topPlaylists,
        topReels: topReelsFormatted,
        topLongVideos,
      },
    });
  } catch (error) {
    console.error("Student getHome Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load home data.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

/**
 * Student home search – teachers, reels, courses, playlists.
 * GET /api/students/search?q=...
 * @access  Private (Student)
 */
const getStudentSearch = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    const q = (req.query.q || req.query.search || "").trim();
    if (!q) {
      return res.status(200).json({
        success: true,
        message: "Search results",
        data: { teachers: [], reels: [], courses: [], playlists: [] },
      });
    }
    const regex = { $regex: escapeRegex(q), $options: "i" };
    const limit = Math.min(Number(req.query.limit) || LIMIT_SEARCH_PER_TYPE, 20);

    const [teacherDocs, reelDocs, courseDocs, playlistDocs] = await Promise.all([
      Teacher.find({
        isActive: true,
        $or: [{ name: regex }, { email: regex }],
      })
        .select("name email avatar")
        .limit(limit)
        .lean(),
      Reel.find({
        isActive: true,
        $or: [
          { title: regex },
          { description: regex },
          { hashtags: regex },
        ],
      })
        .populate("category", "name")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Course.find({
        isActive: true,
        $or: [{ title: regex }, { description: regex }],
      })
        .populate("playlist", "name")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Playlist.find({
        isActive: true,
        $or: [{ name: regex }, { description: regex }],
      })
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const teachers = await Promise.all(teacherDocs.map(async (t) => ({
      _id: t._id.toString(),
      name: t.name,
      email: t.email,
      avatar: await signStoredUrl(t.avatar),
    })));

    const reelsWithUrls = await Promise.all(reelDocs.map((r) => addPresignedReelUrls(r)));
    const reels = reelsWithUrls.map((r) => ({
      ...r,
      _id: r._id.toString(),
      category: r.category ? { _id: r.category._id?.toString(), name: r.category.name } : null,
      createdBy: r.createdBy
        ? {
            _id: r.createdBy._id?.toString?.() ?? r.createdBy?.toString?.(),
            name: r.createdBy.name,
            email: r.createdBy.email,
          }
        : null,
      thumbnail: r.thumbnail
        ? { url: r.thumbnail.url || null, key: r.thumbnail.key || null }
        : { url: null, key: null },
    }));

    const coursesWithUrls = await hideLockedVideoUrls(
      await Promise.all(courseDocs.map((c) => addPresignedCourseUrls(c))),
      req.user.id
    );
    const courses = coursesWithUrls.map((c) => ({
      ...c,
      _id: c._id.toString(),
      playlist: c.playlist ? { _id: c.playlist._id.toString(), name: c.playlist.name } : null,
      createdBy: c.createdBy
        ? {
            _id: c.createdBy._id?.toString?.() ?? c.createdBy?.toString?.(),
            name: c.createdBy.name,
            email: c.createdBy.email,
          }
        : null,
    }));

    const playlistsWithBanners = await Promise.all(playlistDocs.map((p) => addPresignedBannerUrl(p)));
    const playlists = playlistsWithBanners.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      description: p.description || "",
      banner: p.banner || { url: null, key: null },
      createdBy: p.createdBy
        ? {
            _id: p.createdBy._id?.toString?.() ?? p.createdBy?.toString?.(),
            name: p.createdBy.name,
            email: p.createdBy.email,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      message: "Search results",
      data: { teachers, reels, courses, playlists },
    });
  } catch (error) {
    console.error("Student search Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Search failed.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

module.exports = { getStudentHome, getStudentSearch };
