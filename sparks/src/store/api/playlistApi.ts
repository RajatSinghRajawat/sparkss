import { baseApi } from "./baseApi";
import type { ApiResponse } from "../../types/auth.types";
import type {
  GetStudentPlaylistsQuery,
  PlaylistsListResponse,
  PlaylistDetailResponse,
  PlaylistCoursesResponse,
  EnrollResponse,
} from "../../types/playlist.types";
import { API_CONFIG } from "../../config/api.config";

const { ENDPOINTS } = API_CONFIG;

export const playlistApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudentPlaylists: builder.query<
      ApiResponse<PlaylistsListResponse>,
      GetStudentPlaylistsQuery | void
    >({
      query: (params) => {
        const query = params
          ? Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
              .join("&")
          : "";
        return `${ENDPOINTS.PLAYLISTS.LIST}${query ? `?${query}` : ""}`;
      },
      providesTags: (result) =>
        result?.data?.playlists
          ? [
              ...result.data.playlists.map(({ _id }) => ({
                type: "Playlist" as const,
                id: _id,
              })),
              { type: "Playlist", id: "LIST" },
            ]
          : [{ type: "Playlist", id: "LIST" }],
    }),
    getPlaylistById: builder.query<
      ApiResponse<PlaylistDetailResponse>,
      string
    >({
      query: (playlistId) => ENDPOINTS.PLAYLISTS.byId(playlistId),
      providesTags: (_result, _err, playlistId) => [
        { type: "Playlist", id: playlistId },
      ],
    }),
    getPlaylistCourses: builder.query<
      ApiResponse<PlaylistCoursesResponse>,
      string
    >({
      query: (playlistId) => ENDPOINTS.PLAYLISTS.courses(playlistId),
      providesTags: (_result, _err, playlistId) => [
        { type: "Playlist", id: `${playlistId}-courses` },
      ],
    }),
    getEnrollmentStatus: builder.query<
      ApiResponse<EnrollResponse>,
      string
    >({
      query: (playlistId) => ENDPOINTS.PLAYLISTS.enroll(playlistId),
      providesTags: (_result, _err, playlistId) => [
        { type: "Playlist", id: playlistId },
      ],
    }),
    enrollInPlaylist: builder.mutation<
      ApiResponse<EnrollResponse>,
      string | { playlistId: string; adWatched?: boolean }
    >({
      query: (arg) => {
        const playlistId = typeof arg === "string" ? arg : arg.playlistId;
        const body =
          typeof arg === "object" && arg.adWatched ? { adWatched: true } : undefined;
        return {
          url: ENDPOINTS.PLAYLISTS.enroll(playlistId),
          method: "POST",
          ...(body && { body }),
        };
      },
      invalidatesTags: (_result, _err, arg) => {
        const id = typeof arg === "string" ? arg : arg.playlistId;
        return [
          { type: "Playlist", id },
          { type: "Playlist", id: "LIST" },
        ];
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStudentPlaylistsQuery,
  useLazyGetStudentPlaylistsQuery,
  useGetPlaylistByIdQuery,
  useLazyGetPlaylistByIdQuery,
  useGetPlaylistCoursesQuery,
  useLazyGetPlaylistCoursesQuery,
  useGetEnrollmentStatusQuery,
  useEnrollInPlaylistMutation,
} = playlistApi;

