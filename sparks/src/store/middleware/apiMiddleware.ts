import { Middleware, isRejectedWithValue } from "@reduxjs/toolkit";
import { Alert } from "react-native";
import { logout } from "../slices/authSlice";
import { clearAuthStorage } from "../storage";
import { baseApi } from "../api/baseApi";

/**
 * All RTK Query API calls pass through here.
 * Handles: 401/403 logout, network/timeout errors, validation & server errors.
 */
type ApiErrorData = { message?: string; errors?: { field?: string; message?: string }[] };

/** RTK Query reports transport failures as string statuses, HTTP failures as numbers. */
type ApiErrorStatus = number | "FETCH_ERROR" | "TIMEOUT_ERROR" | "PARSING_ERROR" | "CUSTOM_ERROR";

/**
 * Endpoints where the backend answers bad credentials with 401 rather than
 * signalling an expired session. Logging the user out there would hide the
 * real message ("Invalid email or password") behind a silent no-op — and on
 * changePassword it would kick a signed-in user to the login screen for
 * mistyping their current password.
 */
const CREDENTIAL_401_ENDPOINTS = new Set([
  "login",
  "sendOTP",
  "verifyOTP",
  "resendOTP",
  "changePassword",
  "requestDeleteAccount",
]);

/**
 * Endpoints that must not raise an alert from here, either because the calling
 * screen already shows the server's message (a second alert stacks on top of
 * the first) or because the call is fire-and-forget background work that the
 * user never asked for and should not be interrupted by.
 */
const SELF_HANDLED_ENDPOINTS = new Set([
  // Screens with their own Alert on failure
  "changePassword",
  "requestDeleteAccount",
  "updateProfile",
  "getAvatarUploadUrl",
  // Fire-and-forget background calls
  "saveFcmToken",
  "recordReelView",
  "toggleReelLike",
  "toggleReelSave",
  "toggleFollow",
]);

export const apiMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  // Drop every cached response on logout — otherwise the next account to sign
  // in briefly sees the previous student's profile, saved reels and home.
  if (logout.match(action)) {
    const result = next(action);
    store.dispatch(baseApi.util.resetApiState());
    return result;
  }

  if (isRejectedWithValue(action)) {
    const payload = (action as { payload?: { status?: ApiErrorStatus; data?: ApiErrorData } }).payload;
    const status = payload?.status;
    const errorData = payload?.data as ApiErrorData | undefined;
    const errorMessage =
      errorData?.message || "Something went wrong. Please try again.";
    const endpointName = (action as { meta?: { arg?: { endpointName?: string } } })
      .meta?.arg?.endpointName;

    const isCredential401 = !!endpointName && CREDENTIAL_401_ENDPOINTS.has(endpointName);
    const screenHandlesError = !!endpointName && SELF_HANDLED_ENDPOINTS.has(endpointName);
    const alert = (title: string, message: string) => {
      if (!screenHandlesError) Alert.alert(title, message);
    };

    if (status === 401) {
      // A 401 from a credential check means "wrong password", not "session
      // expired" — signing the user out there hides the real message.
      if (isCredential401) {
        alert("Error", errorMessage);
        return next(action);
      }
      clearAuthStorage();
      store.dispatch(logout());
      return next(action);
    }

    if (status === 403) {
      alert("Access Denied", errorMessage);
      // 403 also means "not enrolled" etc.; only a deactivated account ends
      // the session (it used to log students out for tapping a locked video).
      if (/deactivated/i.test(errorMessage)) {
        clearAuthStorage();
        store.dispatch(logout());
      }
      return next(action);
    }

    if (status === 429) {
      alert("Too Many Attempts", errorMessage);
      return next(action);
    }

    if (status === "FETCH_ERROR") {
      alert(
        "Network Error",
        "Unable to connect. Please check your internet and try again."
      );
      return next(action);
    }

    if (status === "TIMEOUT_ERROR") {
      alert("Request Timeout", "The request took too long. Please try again.");
      return next(action);
    }

    if (typeof status === "number" && status >= 500) {
      alert("Server Error", "Something went wrong. Please try again later.");
      return next(action);
    }

    if (status === 400 && Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
      const details = errorData.errors
        .map((e) => `${e.field || "Field"}: ${e.message || ""}`)
        .join("\n");
      alert("Validation Failed", `${errorMessage}\n\n${details}`);
      return next(action);
    }

    if (typeof status === "number" && status >= 400 && status < 500) {
      alert("Error", errorMessage);
      return next(action);
    }
  }

  return next(action);
};
