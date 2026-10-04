import { baseApi } from "./baseApi";
import type { HomeData, SearchResponse } from "../../types/home.types";
import { API_CONFIG } from "../../config/api.config";

const { ENDPOINTS } = API_CONFIG;

export interface GetHomeApiResponse {
  success: boolean;
  message?: string;
  data: HomeData;
}

export type SearchQueryArg = { q: string; limit?: number };

export const homeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHome: builder.query<GetHomeApiResponse, void>({
      query: () => ENDPOINTS.HOME,
      providesTags: [
        { type: "Playlist", id: "LIST" },
        { type: "Reel", id: "LIST" },
        "Home",
      ],
    }),
    getSearch: builder.query<SearchResponse, SearchQueryArg>({
      query: ({ q, limit }) => {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (limit != null) params.set("limit", String(limit));
        const suffix = params.toString() ? `?${params.toString()}` : "";
        return `${ENDPOINTS.SEARCH}${suffix}`;
      },
    }),
  }),
  overrideExisting: false,
});

export const { useGetHomeQuery, useLazyGetHomeQuery, useLazyGetSearchQuery } = homeApi;
