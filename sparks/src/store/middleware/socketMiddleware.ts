import type { Middleware } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { setConnected, setDisconnected, setError } from "../slices/socketSlice";
import { io } from "socket.io-client";
import { getSocketBaseUrl } from "../../config/api.config";
import { setSocket } from "../../services/socket";

let socketInstance: ReturnType<typeof io> | null = null;

export const socketMiddleware: Middleware<object, RootState> =
  (store) => (next) => (action: unknown) => {
  const actionType = (action as { type?: string })?.type;

  if (actionType === "socket/connect") {
    const state = store.getState();
    const token = state.auth.token;
    if (!token) {
      store.dispatch(setError("Not authenticated"));
      return next(action);
    }

    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    const url = getSocketBaseUrl();
    const socket = io(url, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketInstance = socket;
    setSocket(socket);

    socket.on("connect", () => {
      console.log("🔌 Socket connected");
      store.dispatch(setConnected());
    });

    socket.on("disconnect", () => {
      store.dispatch(setDisconnected());
    });

    socket.on("connect_error", (err) => {
      const msg = err?.message ?? "Connection failed";
      console.log("🔌 Socket error:", msg);
      store.dispatch(setError(msg));
    });

    return next(action);
  }

  if (actionType === "socket/disconnect") {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      setSocket(null);
    }
    return next(action);
  }

  return next(action);
};
