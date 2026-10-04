import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { AppState } from "react-native";
import { baseApi } from "./api/baseApi";
import authReducer from "./slices/authSlice";
import socketReducer from "./slices/socketSlice";
import { apiMiddleware } from "./middleware/apiMiddleware";
import { socketMiddleware } from "./middleware/socketMiddleware";

const rootReducer = combineReducers({
  auth: authReducer,
  socket: socketReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

/**
 * Derived from the reducer map rather than the store, so middleware can import
 * it without the store -> middleware -> RootState -> store type cycle.
 */
export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    })
      .concat(baseApi.middleware)
      .concat(apiMiddleware)
      .concat(socketMiddleware),
});

// RTK's default listeners use window focus events, which React Native doesn't
// have — so refetchOnFocus never fired and cached S3 links (valid 1h) went
// stale. Use AppState instead; brief interruptions (permission dialogs,
// notification shade) don't count as leaving.
const FOCUS_REFETCH_AFTER_MS = 30_000;
setupListeners(store.dispatch, (dispatch, { onFocus, onFocusLost }) => {
  let backgroundedAt: number | null = null;
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      if (backgroundedAt !== null && Date.now() - backgroundedAt >= FOCUS_REFETCH_AFTER_MS) {
        dispatch(onFocus());
      }
      backgroundedAt = null;
    } else if (state === "background" && backgroundedAt === null) {
      backgroundedAt = Date.now();
      dispatch(onFocusLost());
    }
  });
  return () => sub.remove();
});

export type AppDispatch = typeof store.dispatch;
