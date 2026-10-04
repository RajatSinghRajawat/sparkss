// ─── Reel API types (student app) ───

export interface ReelCategory {
  _id: string;
  name: string;
}

export interface ReelCreatedBy {
  _id: string;
  name: string;
  email: string;
}

export interface ReelVideo {
  url: string;
  key?: string;
}

export interface ReelThumbnail {
  url: string | null;
  key?: string | null;
}

export interface ReelFromApi {
  _id: string;
  title: string;
  description?: string;
  video: ReelVideo;
  thumbnail?: ReelThumbnail;
  category: ReelCategory;
  createdBy: ReelCreatedBy;
  hashtags?: string[];
  duration?: number;
  views?: number;
  likes?: number;
  totalViews?: number;
  totalLikes?: number;
  isReelLike?: boolean;
  isReelSave?: boolean;
  isFollow?: boolean;
  teacherFollowersCount?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Reel actions API response types ───
export interface ReelLikeResponse {
  liked: boolean;
  likesCount: number;
}

export interface ReelSaveResponse {
  saved: boolean;
}

export interface ReelViewResponse {
  reelId: string;
  viewsCount: number;
}

export interface FollowResponse {
  following: boolean;
  teacher: { id: string; name: string };
}

export interface FollowStatusResponse {
  teacher: { id: string; name: string };
  following: boolean;
}

export interface GetReelsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: "createdAt" | "title" | "views" | "likes";
  order?: "asc" | "desc";
}

export interface ReelsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ReelsListResponse {
  reels: ReelFromApi[];
  pagination: ReelsPagination;
}

// ─── Saved reels (reels the student bookmarked) ───
export interface GetSavedReelsQuery {
  page?: number;
  limit?: number;
}

/** Same shape as the reels feed, so the saved list can reuse the reel player. */
export type SavedReelsListResponse = ReelsListResponse;

// ─── Teacher profile (by ID) API ───
export interface TeacherProfile {
  _id: string;
  name: string;
  avatar: string | null;
  followersCount: number;
}

export interface TeacherProfileReel {
  _id: string;
  title: string;
  description?: string;
  video: ReelVideo;
  thumbnail?: ReelThumbnail;
  category: ReelCategory;
  hashtags?: string[];
  duration?: number;
  views?: number;
  likes?: number;
  createdBy: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetTeacherProfileQuery {
  teacherId: string;
  page?: number;
  limit?: number;
}

// ─── Teacher profile course (from teacher profile API) ───
export interface TeacherProfileCourse {
  _id: string;
  playlist: { _id: string; name: string };
  title: string;
  description?: string;
  thumbnail?: { url: string | null; key?: string | null };
  video?: { url: string | null; key?: string | null };
  duration?: number;
}

// ─── Teacher profile long video (from teacher profile API) ───
export interface TeacherProfileVideo {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: { url: string | null; key?: string | null };
  video?: { url: string | null; key?: string | null };
  duration?: number;
}

export interface TeacherProfileResponse {
  teacher: TeacherProfile;
  reels: TeacherProfileReel[];
  pagination: ReelsPagination;
  courses?: TeacherProfileCourse[];
  videos?: TeacherProfileVideo[];
}

// ─── Following list (teachers the student follows) ───
export interface FollowingTeacher {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface FollowingListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FollowingListResponse {
  teachers: FollowingTeacher[];
  pagination: FollowingListPagination;
}

export interface GetFollowingListQuery {
  page?: number;
  limit?: number;
}
