import { baseApi } from "./baseApi";
import type { GetStudentTestsQuery, TestsListResponse, TestFromApi, TestResultResponse } from "../../types/test.types";
import type { ApiResponse } from "../../types/auth.types";
import { API_CONFIG } from "../../config/api.config";

const { ENDPOINTS } = API_CONFIG;

export const studentTestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudentTests: builder.query<
      ApiResponse<TestsListResponse>,
      GetStudentTestsQuery
    >({
      query: ({ type, page, limit }) => {
        const params = new URLSearchParams();
        params.set("type", type);
        params.set("page", String(page));
        params.set("limit", String(limit));
        return `${ENDPOINTS.TESTS.LIST}?${params.toString()}`;
      },
      providesTags: (result, _err, { type }) =>
        result?.data?.tests
          ? [
              ...result.data.tests.map(({ _id }) => ({ type: "Test" as const, id: _id })),
              { type: "Test", id: `${type}-LIST` },
            ]
          : [{ type: "Test", id: `${type}-LIST` }],
    }),
    getStudentTestById: builder.query<ApiResponse<{ test: TestFromApi }>, string>({
      query: (testId) => ENDPOINTS.TESTS.byId(testId),
      providesTags: (_result, _err, testId) => [{ type: "Test", id: testId }],
    }),
    submitAnswer: builder.mutation<
      ApiResponse<{ questionNumber: number; isCorrect: boolean; totalQuestions: number; answeredCount: number }>,
      { testId: string; questionNumber: number; selectedOption: number }
    >({
      query: ({ testId, questionNumber, selectedOption }) => ({
        url: ENDPOINTS.TESTS.answer(testId),
        method: "POST",
        body: { questionNumber, selectedOption },
      }),
      invalidatesTags: (_result, _err, { testId }) => [{ type: "Test", id: testId }],
    }),
    completeQuiz: builder.mutation<
      ApiResponse<{ correctCount: number; total: number; scorePercent: number }>,
      string
    >({
      query: (testId) => ({
        url: ENDPOINTS.TESTS.complete(testId),
        method: "PATCH",
      }),
      // The finished quiz moves into "Completed" — refresh both lists too.
      invalidatesTags: (_result, _err, testId) => [
        { type: "Test", id: testId },
        { type: "Test", id: "my_completed-LIST" },
        { type: "Test", id: "today-LIST" },
      ],
    }),
    getStudentTestResult: builder.query<ApiResponse<TestResultResponse>, string>({
      query: (testId) => ENDPOINTS.TESTS.result(testId),
      providesTags: (_result, _err, testId) => [{ type: "Test", id: `${testId}-result` }],
    }),
    // Toggle the per-test notification subscription (bell)
    toggleTestNotification: builder.mutation<
      ApiResponse<{ testId: string; subscribed: boolean }>,
      string
    >({
      query: (testId) => ({
        url: ENDPOINTS.TESTS.notify(testId),
        method: "POST",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStudentTestsQuery,
  useLazyGetStudentTestsQuery,
  useGetStudentTestByIdQuery,
  useGetStudentTestResultQuery,
  useSubmitAnswerMutation,
  useCompleteQuizMutation,
  useToggleTestNotificationMutation,
} = studentTestApi;
