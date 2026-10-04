// ─── Student Home API response types ───

export interface HomeBannerItem {
  _id: string;
  title: string;
  link: string;
  imageUrl: string;
  order: number;
}

export interface HomePlaylistItem {
  _id: string;
  name: string;
  description?: string;
  banner: { url: string | null; key?: string | null };
  createdBy: { _id: string; name: string; email: string; avatar?: string | null };
  isActive?: boolean;
  videoCount: number;
  enrollmentsCount: number;
  averageRating?: number | null;
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeReelItem {
  _id: string;
  title: string;
  description?: string;
  video: { url: string; key?: string };
  thumbnail?: { url: string | null; key?: string | null };
  category: { _id: string; name: string } | null;
  createdBy: { _id: string; name: string; email: string } | null;
  hashtags?: string[];
  duration?: number;
  views?: number;
  likes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeLongVideoItem {
  _id: string;
  title: string;
  description?: string;
  video: { url: string | null; key?: string | null };
  thumbnail: { url: string | null; key?: string | null };
  playlist: { _id: string; name: string } | null;
  createdBy: { _id: string; name: string; email: string } | null;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeTeacherItem {
  _id: string;
  name: string;
  avatar: string | null;
  followersCount: number;
  totalReelViews: number;
}

export interface HomeData {
  banners: HomeBannerItem[];
  topTeachers: HomeTeacherItem[];
  topPlaylists: HomePlaylistItem[];
  topReels: HomeReelItem[];
  topLongVideos: HomeLongVideoItem[];
}

export interface HomeResponse {
  success: boolean;
  message?: string;
  data: HomeData;
}

// ─── Student Search API (same shapes as home where applicable) ───
export interface SearchTeacherItem {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface SearchPlaylistItem {
  _id: string;
  name: string;
  description?: string;
  banner: { url: string | null; key?: string | null };
  createdBy: { _id: string; name: string; email: string } | null;
}

export interface SearchData {
  teachers: SearchTeacherItem[];
  reels: HomeReelItem[];
  courses: HomeLongVideoItem[];
  playlists: SearchPlaylistItem[];
}

export interface SearchResponse {
  success: boolean;
  message?: string;
  data: SearchData;
}
