import { baseApi } from "./baseApi";
import {
  LoginRequest,
  SendOTPRequest,
  VerifyOTPRequest,
  ResendOTPRequest,
  ApiResponse,
  AuthResponse,
  OTPResponse,
  Student,
  StudentProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  DeleteAccountRequest,
  SaveFcmTokenRequest,
} from "../../types/auth.types";
import { API_CONFIG } from "../../config/api.config";

const { ENDPOINTS } = API_CONFIG;

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<AuthResponse>, LoginRequest>({
      query: (credentials) => ({
        url: ENDPOINTS.AUTH.LOGIN,
        method: "POST",
        body: credentials,
      }),
    }),
    sendOTP: builder.mutation<ApiResponse<OTPResponse>, SendOTPRequest>({
      query: (data) => ({
        url: ENDPOINTS.AUTH.SEND_OTP,
        method: "POST",
        body: data,
      }),
    }),
    verifyOTP: builder.mutation<ApiResponse<AuthResponse>, VerifyOTPRequest>({
      query: (data) => ({
        url: ENDPOINTS.AUTH.VERIFY_OTP,
        method: "POST",
        body: data,
      }),
    }),
    resendOTP: builder.mutation<ApiResponse<OTPResponse>, ResendOTPRequest>({
      query: (data) => ({
        url: ENDPOINTS.AUTH.RESEND_OTP,
        method: "POST",
        body: data,
      }),
    }),
    getMe: builder.query<ApiResponse<{ student: Student }>, void>({
      query: () => ENDPOINTS.AUTH.ME,
      providesTags: ["Student"],
    }),
    getProfile: builder.query<ApiResponse<StudentProfile>, void>({
      query: () => ENDPOINTS.AUTH.PROFILE,
      providesTags: ["Student"],
    }),
    updateProfile: builder.mutation<
      ApiResponse<{ student: Record<string, unknown> }>,
      UpdateProfileRequest
    >({
      query: (body) => ({
        url: ENDPOINTS.AUTH.ME,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Student"],
    }),
    getAvatarUploadUrl: builder.mutation<
      ApiResponse<{ uploadUrl: string; key: string; fileUrl: string }>,
      { avatarType: string }
    >({
      query: (body) => ({
        url: ENDPOINTS.AUTH.AVATAR_UPLOAD_URL,
        method: "POST",
        body,
      }),
    }),
    changePassword: builder.mutation<ApiResponse<unknown>, ChangePasswordRequest>({
      query: (body) => ({
        url: ENDPOINTS.AUTH.CHANGE_PASSWORD,
        method: "POST",
        body,
      }),
    }),
    requestDeleteAccount: builder.mutation<ApiResponse<unknown>, DeleteAccountRequest>({
      query: (body) => ({
        url: ENDPOINTS.AUTH.DELETE_ACCOUNT,
        method: "POST",
        body,
      }),
    }),
    saveFcmToken: builder.mutation<ApiResponse<unknown>, SaveFcmTokenRequest>({
      query: (body) => ({
        url: ENDPOINTS.AUTH.FCM_TOKEN,
        method: "POST",
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
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
} = authApi;
