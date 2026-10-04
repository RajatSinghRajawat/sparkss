export { store } from "./store";
export type { RootState, AppDispatch } from "./store";
export { useAppDispatch, useAppSelector } from "./hooks";

export {
  setCredentials,
  setStudent,
  logout,
  setAuthLoading,
  restoreAuth,
} from "./slices/authSlice";

export { connect as socketConnect, disconnect as socketDisconnect } from "./slices/socketSlice";

export {
  useLoginMutation,
  useSendOTPMutation,
  useVerifyOTPMutation,
  useResendOTPMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useUpdateProfileMutation,
  useGetAvatarUploadUrlMutation,
  useChangePasswordMutation,
  useRequestDeleteAccountMutation,
  useSaveFcmTokenMutation,
} from "./api/authApi";

export {
  useGetHelpMessagesQuery,
  useLazyGetHelpMessagesQuery,
  useSendHelpMessageMutation,
} from "./api/helpApi";

export {
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
} from "./api/reelApi";

export {
  useGetStudentTestsQuery,
  useLazyGetStudentTestsQuery,
  useGetStudentTestByIdQuery,
  useGetStudentTestResultQuery,
  useSubmitAnswerMutation,
  useCompleteQuizMutation,
  useToggleTestNotificationMutation,
} from "./api/studentTestApi";

export {
  useGetHomeQuery,
  useLazyGetHomeQuery,
  useLazyGetSearchQuery,
} from "./api/homeApi";

export {
  useGetStudentPlaylistsQuery,
  useLazyGetStudentPlaylistsQuery,
  useGetPlaylistByIdQuery,
  useLazyGetPlaylistByIdQuery,
  useGetPlaylistCoursesQuery,
  useLazyGetPlaylistCoursesQuery,
  useGetEnrollmentStatusQuery,
  useEnrollInPlaylistMutation,
} from "./api/playlistApi";

export {
  useGetCourseByIdQuery,
  useLazyGetCourseByIdQuery,
  useGetMyRatingQuery,
  useSubmitRatingMutation,
} from "./api/courseApi";

export {
  saveToken,
  getToken,
  removeToken,
  saveStudent,
  getStudent,
  removeStudent,
  clearAuthStorage,
} from "./storage";
