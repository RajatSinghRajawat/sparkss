import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { API_CONFIG } from "../../config/api.config";
import { logout } from "../slices/authSlice";
import type { RootState } from "../store";
import { getToken } from "../storage";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

/** Kept in sync with the same list in ../middleware/apiMiddleware. */
const CREDENTIAL_401_ENDPOINTS = new Set([
  "login",
  "sendOTP",
  "verifyOTP",
  "resendOTP",
  "changePassword",
  "requestDeleteAccount",
]);

const baseQueryWithInterceptor: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let token = (api.getState() as RootState).auth.token;

  if (!token) {
    try {
      token = await getToken();
      if (__DEV__ && token) {
        console.log("🔑 Token loaded from AsyncStorage (Redux was empty)");
      }
    } catch {
      token = null;
    }
  }

  const isFormData =
    typeof args !== "string" && args && typeof args === "object" && "body" in args && args.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let finalArgs: FetchArgs;
  if (typeof args === "string") {
    finalArgs = { url: args, headers };
  } else {
    finalArgs = {
      ...args,
      headers: {
        ...headers,
        ...(args.headers as Record<string, string>),
      },
    };
  }

  if (__DEV__) {
    const method = finalArgs.method || "GET";
    console.log(
      `🌐 API [${method}] ${finalArgs.url} ${token ? "🔑" : "🚫 no token"}`
    );
  }

  const result = await rawBaseQuery(finalArgs, api, extraOptions);

  if (result.error) {
    const status = result.error.status;
    // A 401 from these means "wrong credentials", not "session expired", so the
    // screen can surface the message instead of the user being signed out.
    const isCredentialCheck = CREDENTIAL_401_ENDPOINTS.has(api.endpoint);
    if (status === 401 && !isCredentialCheck) {
      if (__DEV__) console.log("🔒 401 Unauthorized — Logging out and redirecting to login");
      api.dispatch(logout());
    }
    if (__DEV__) {
      console.log("❌ API Error:", {
        status,
        data: result.error.data,
      });
    }
  } else {
    if (__DEV__) console.log("✅ API Success");
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithInterceptor,
  // Media URLs in responses are presigned for 1h: refresh when the app comes
  // back to the foreground, and on remount once data is 30+ min old.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 1800,
  tagTypes: ["Student", "Reel", "Test", "Playlist", "Course", "Help", "Home"],
  endpoints: () => ({}),
});
