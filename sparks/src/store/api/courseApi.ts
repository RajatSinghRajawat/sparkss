import { baseApi } from "./baseApi";
import type { ApiResponse } from "../../types/auth.types";
import type {
  CourseFromApi,
  CourseRatingResponse,
  SubmitRatingResponse,
} from "../../types/playlist.types";
import { API_CONFIG } from "../../config/api.config";

const { ENDPOINTS } = API_CONFIG;

export const courseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCourseById: builder.query<ApiResponse<{ course: CourseFromApi }>, string>({
      query: (courseId) => ENDPOINTS.COURSES.byId(courseId),
      providesTags: (_result, _err, courseId) => [
        { type: "Course", id: courseId },
      ],
    }),
    getMyRating: builder.query<
      ApiResponse<CourseRatingResponse>,
      string
    >({
      query: (courseId) => ENDPOINTS.COURSES.rate(courseId),
      providesTags: (_result, _err, courseId) => [
        { type: "Course", id: `${courseId}-rating` },
      ],
    }),
    submitRating: builder.mutation<
      ApiResponse<SubmitRatingResponse>,
      { courseId: string; rating: number }
    >({
      query: ({ courseId, rating }) => ({
        url: ENDPOINTS.COURSES.rate(courseId),
        method: "POST",
        body: { rating },
      }),
      invalidatesTags: (_result, _err, { courseId }) => [
        { type: "Course", id: courseId },
        { type: "Course", id: `${courseId}-rating` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCourseByIdQuery,
  useLazyGetCourseByIdQuery,
  useGetMyRatingQuery,
  useSubmitRatingMutation,
} = courseApi;
