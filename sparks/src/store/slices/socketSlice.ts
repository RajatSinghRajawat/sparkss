import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SocketStatus = "disconnected" | "connecting" | "connected" | "error";

interface SocketState {
  status: SocketStatus;
  error: string | null;
}

const initialState: SocketState = {
  status: "disconnected",
  error: null,
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    connect: (state) => {
      state.status = "connecting";
      state.error = null;
    },
    setConnected: (state) => {
      state.status = "connected";
      state.error = null;
    },
    setDisconnected: (state) => {
      state.status = "disconnected";
      state.error = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.status = "error";
      state.error = action.payload ?? "Connection failed";
    },
    disconnect: (state) => {
      state.status = "disconnected";
      state.error = null;
    },
  },
});

export const {
  connect,
  setConnected,
  setDisconnected,
  setError,
  disconnect,
} = socketSlice.actions;

export default socketSlice.reducer;
