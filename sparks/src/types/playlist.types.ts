// ─── Playlist API types (student app) ───

export interface PlaylistBanner {
  url: string | null;
  key: string | null;
}

export interface PlaylistCreatedBy {
  _id: string;
  name: string;
  email: string;
  /** Teacher avatar URL (if set) */
  avatar?: string | null;
}

export interface PlaylistFromApi {
  _id: string;
  name: string;
  description?: string;
  banner: PlaylistBanner;
  createdBy: PlaylistCreatedBy;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  /** From API when listing playlists for students */
  videoCount?: number;
  enrollmentsCount?: number;
  /** Average of all video ratings in this playlist (1–5) */
  averageRating?: number | null;
  /** Total number of ratings in this playlist */
  ratingCount?: number;
}

/** Single playlist detail (student) includes isEnrolled */
export interface PlaylistDetailFromApi extends PlaylistFromApi {
  videoCount: number;
  enrollmentsCount: number;
  isEnrolled: boolean;
}

// ─── Course (lesson/video in playlist) types ───
export interface CourseVideoUrl {
  url: string | null;
  key: string | null;
}

export interface CourseThumbnailUrl {
  url: string | null;
  key: string | null;
}

export interface CourseFromApi {
  _id: string;
  playlist: { _id: string; name: string };
  title: string;
  description?: string;
  video: CourseVideoUrl;
  thumbnail: CourseThumbnailUrl;
  duration: number;
  createdBy: PlaylistCreatedBy;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  /** Student's rating for this video (1–5), when fetched in playlist context */
  myRating?: number | null;
}

export interface GetStudentPlaylistsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "createdAt" | "name";
  order?: "asc" | "desc";
}

export interface PlaylistsListResponse {
  playlists: PlaylistFromApi[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface PlaylistDetailResponse {
  playlist: PlaylistDetailFromApi;
}

export interface PlaylistCoursesResponse {
  courses: CourseFromApi[];
}

export interface EnrollResponse {
  enrolled: boolean;
}

export interface CourseRatingResponse {
  rated: boolean;
  rating: number | null;
}

export interface SubmitRatingResponse {
  rating: number;
}

