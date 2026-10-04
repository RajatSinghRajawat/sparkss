/**
 * Socket.IO client for test (quiz) real-time events.
 * Global socket is managed by Redux (socketMiddleware); use getSocket() in app.
 */

import type { Socket } from "socket.io-client";

export type TestJoinPayload = {
  testId: string;
  token?: string;
};

export type TestJoinedResponse = {
  success: boolean;
  reason?: "invalid" | "unauthorized" | "not_found" | "too_early" | "expired";
  message?: string;
  status?: "countdown" | "started";
  startTime?: string;
  endTime?: string;
};

export type TestStartPayload = {
  testId: string;
  startTime: string;
};

export type TestExpiredPayload = {
  testId: string;
  message: string;
};

let globalSocket: Socket | null = null;

/** Set by socketMiddleware when global socket connects. */
export function setSocket(socket: Socket | null): void {
  globalSocket = socket;
}

/** Get the global Redux-managed socket. Use this in quiz play screen. */
export function getSocket(): Socket | null {
  return globalSocket;
}
