import { baseApi } from "./baseApi";
import type {
  GetReelsQuery,
  ReelsListResponse,
  ReelLikeResponse,
  ReelSaveResponse,
  ReelViewResponse,
  FollowResponse,
  FollowStatusResponse,
  GetTeacherProfileQuery,
  TeacherProfileResponse,
  GetFollowingListQuery,
  FollowingListResponse,
  GetSavedReelsQuery,
  SavedReelsListResponse,
} from "../../types/reel.types";
import type { ApiResponse } from "../../types/auth.types";
import { API_CONFIG } from "../../config/api.config";

const { ENDPOINTS } = API_CONFIG;

export const reelApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReels: builder.query<
      ApiResponse<ReelsListResponse>,
      GetReelsQuery | void
    >({
      query: (params) => {
        const query = params
          ? Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
              .join("&")
          : "";
        return `${ENDPOINTS.REELS.LIST}${query ? `?${query}` : ""}`;
      },
      providesTags: (result) =>
        result?.data?.reels
          ? [
              ...result.data.reels.map(({ _id }) => ({
                type: "Reel" as const,
                id: _id,
              })),
              { type: "Reel", id: "LIST" },
            ]
          : [{ type: "Reel", id: "LIST" }],
    }),

    // ─── Like ───
    getReelLikeStatus: builder.query<
      ApiResponse<{ likesCount: number; likedByMe: boolean }>,
      string
    >({
      query: (reelId) => ENDPOINTS.REELS.like(reelId),
      providesTags: (_result, _err, reelId) => [
        { type: "Reel", id: `${reelId}-like` },
      ],
    }),
    toggleReelLike: builder.mutation<
      ApiResponse<ReelLikeResponse>,
      string
    >({
      query: (reelId) => ({
        url: ENDPOINTS.REELS.like(reelId),
        method: "POST",
      }),
      invalidatesTags: (_result, _err, reelId) => [
        { type: "Reel", id: `${reelId}-like` },
      ],
    }),

    // ─── Save ───
    getReelSaveStatus: builder.query<
      ApiResponse<{ savedByMe: boolean }>,
      string
    >({
      query: (reelId) => ENDPOINTS.REELS.save(reelId),
      providesTags: (_result, _err, reelId) => [
        { type: "Reel", id: `${reelId}-save` },
      ],
    }),
    toggleReelSave: builder.mutation<
      ApiResponse<ReelSaveResponse>,
      string
    >({
      query: (reelId) => ({
        url: ENDPOINTS.REELS.save(reelId),
        method: "POST",
      }),
      // SAVED_LIST so the profile's Saved tab reflects the change immediately.
      invalidatesTags: (_result, _err, reelId) => [
        { type: "Reel", id: `${reelId}-save` },
        { type: "Reel", id: "SAVED_LIST" },
      ],
    }),

    // ─── Saved reels list (profile → Saved tab) ───
    getSavedReels: builder.query<
      ApiResponse<SavedReelsListResponse>,
      GetSavedReelsQuery | void
    >({
      query: (params) => {
        const query = params
          ? Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
              .join("&")
          : "";
        return `${ENDPOINTS.REELS.SAVED}${query ? `?${query}` : ""}`;
      },
      providesTags: [{ type: "Reel", id: "SAVED_LIST" }],
    }),

    // ─── View ───
    recordReelView: builder.mutation<
      ApiResponse<ReelViewResponse>,
      string
    >({
      query: (reelId) => ({
        url: ENDPOINTS.REELS.view(reelId),
        method: "POST",
      }),
      // No invalidation: refetching the feed (and Home) on every view re-signed
      // all URLs and restarted the reel being watched.
    }),

    // ─── Teacher profile (by ID) + paginated reels ───
    getTeacherProfile: builder.query<
      ApiResponse<TeacherProfileResponse>,
      GetTeacherProfileQuery
    >({
      query: ({ teacherId, page = 1, limit = 5 }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        return `${ENDPOINTS.TEACHERS.profile(teacherId)}?${params.toString()}`;
      },
      providesTags: (_result, _err, { teacherId }) => [
        { type: "Student", id: `teacher-${teacherId}` },
      ],
    }),

    // ─── Follow teacher ───
    getFollowStatus: builder.query<
      ApiResponse<FollowStatusResponse>,
      string
    >({
      query: (teacherId) => ENDPOINTS.TEACHERS.follow(teacherId),
      providesTags: (_result, _err, teacherId) => [
        { type: "Student", id: `follow-${teacherId}` },
      ],
    }),
    toggleFollow: builder.mutation<
      ApiResponse<FollowResponse>,
      string
    >({
      query: (teacherId) => ({
        url: ENDPOINTS.TEACHERS.follow(teacherId),
        method: "POST",
      }),
      invalidatesTags: (_result, _err, teacherId) => [
        { type: "Student", id: `follow-${teacherId}` },
        { type: "Student", id: "following-list" },
        // Teacher profile shows the follower count.
        { type: "Student", id: `teacher-${teacherId}` },
      ],
    }),

    // ─── List of teachers the student is following ───
    getFollowingList: builder.query<
      ApiResponse<FollowingListResponse>,
      GetFollowingListQuery | void
    >({
      query: (params) => {
        const query = params
          ? Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
              .join("&")
          : "";
        return `${ENDPOINTS.TEACHERS.FOLLOWING}${query ? `?${query}` : ""}`;
      },
      providesTags: [{ type: "Student", id: "following-list" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetReelsQuery,
  useLazyGetReelsQuery,
  useGetTeacherProfileQuery,
  useGetReelLikeStatusQuery,
  useToggleReelLikeMutation,
  useGetReelSaveStatusQuery,
  useToggleReelSaveMutation,
  useGetSavedReelsQuery,
  useLazyGetSavedReelsQuery,
  useRecordReelViewMutation,
  useGetFollowStatusQuery,
  useToggleFollowMutation,
  useGetFollowingListQuery,
  useLazyGetFollowingListQuery,
} = reelApi;
