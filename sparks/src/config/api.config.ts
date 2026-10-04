// ─── API Configuration (Student App) ───
// All API calls go through baseUrl; change for environment

import { Platform } from "react-native";
import Constants from "expo-constants";

/** Live backend. Keep it without a trailing slash — endpoints already start with "/". */
// Never "localhost": on a phone that's the phone itself, so every request
// fails with FETCH_ERROR. Local testing goes through USE_LOCAL_API below.
const PROD_BASE_URL = "https://api.sparks-learning.com";
const LOCAL_API_PORT = 5000;

/**
 * Set to true to hit the backend running on this machine from a dev build
 * instead of the live server. Production builds always use PROD_BASE_URL.
 */
const USE_LOCAL_API = false;

/**
 * The LAN host Metro is served from, e.g. "172.20.10.2" out of "172.20.10.2:8081".
 * Deriving it means the API URL follows the machine's current IP instead of
 * needing a code edit every time the network changes.
 */
const getMetroHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | null | undefined)?.debuggerHost;
  const host = hostUri?.split(":")[0];
  return host && host !== "localhost" && host !== "127.0.0.1" ? host : null;
};

const getBaseUrl = () => {
  if (__DEV__ && USE_LOCAL_API) {
    const host = getMetroHost();
    if (host) {
      return `http://${host}:${LOCAL_API_PORT}`;
    }
    // Android emulator reaches the host machine on 10.0.2.2, simulators on localhost
    return Platform.OS === "android"
      ? `http://10.0.2.2:${LOCAL_API_PORT}`
      : `http://localhost:${LOCAL_API_PORT}`;
  }
  return PROD_BASE_URL;
};

/** Trailing slashes produce "//api/..." once joined with an endpoint path. */
const BASE_URL = getBaseUrl().replace(/\/+$/, "");

export const API_CONFIG = {
  BASE_URL,
  TIMEOUT: 60000,
  ENDPOINTS: {
    HOME: "/api/students/home",
    SEARCH: "/api/students/search",
    AUTH: {
      SEND_OTP: "/api/students/send-otp",
      VERIFY_OTP: "/api/students/verify-otp",
      RESEND_OTP: "/api/students/resend-otp",
      LOGIN: "/api/students/login",
      ME: "/api/students/me",
      PROFILE: "/api/students/profile",
      AVATAR_UPLOAD_URL: "/api/students/avatar-upload-url",
      CHANGE_PASSWORD: "/api/students/change-password",
      DELETE_ACCOUNT: "/api/students/delete-account",
      HELP: "/api/students/help",
      FCM_TOKEN: "/api/students/fcm-token",
    },
    REELS: {
      LIST: "/api/students/reels",
      SAVED: "/api/students/reels/saved",
      like: (reelId: string) => `/api/students/reels/${reelId}/like`,
      save: (reelId: string) => `/api/students/reels/${reelId}/save`,
      view: (reelId: string) => `/api/students/reels/${reelId}/view`,
    },
    TEACHERS: {
      profile: (teacherId: string) => `/api/students/teachers/${teacherId}`,
      follow: (teacherId: string) => `/api/students/teachers/${teacherId}/follow`,
      FOLLOWING: "/api/students/following",
    },
    TESTS: {
      LIST: "/api/students/tests",
      byId: (testId: string) => `/api/students/tests/${testId}`,
      result: (testId: string) => `/api/students/tests/${testId}/result`,
      answer: (testId: string) => `/api/students/tests/${testId}/answer`,
      complete: (testId: string) => `/api/students/tests/${testId}/complete`,
      notify: (testId: string) => `/api/students/tests/${testId}/notify`,
    },
    PLAYLISTS: {
      LIST: "/api/students/playlists",
      byId: (playlistId: string) => `/api/students/playlists/${playlistId}`,
      courses: (playlistId: string) =>
        `/api/students/playlists/${playlistId}/courses`,
      enroll: (playlistId: string) =>
        `/api/students/playlists/${playlistId}/enroll`,
    },
    COURSES: {
      byId: (courseId: string) => `/api/students/courses/${courseId}`,
      rate: (courseId: string) => `/api/students/courses/${courseId}/rate`,
    },
  },
};

/** Socket.IO base URL (same host as API, no path) */
export const getSocketBaseUrl = () => API_CONFIG.BASE_URL;
