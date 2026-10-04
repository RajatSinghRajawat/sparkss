import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, Student } from "../../types/auth.types";

const initialState: AuthState = {
  student: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ student: Student; token: string }>
    ) => {
      state.student = action.payload.student;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    setStudent: (state, action: PayloadAction<Student>) => {
      state.student = action.payload;
    },
    logout: (state) => {
      state.student = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    restoreAuth: (
      state,
      action: PayloadAction<{ student: Student; token: string } | null>
    ) => {
      if (action.payload) {
        state.student = action.payload.student;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      }
      state.isLoading = false;
    },
  },
});

export const {
  setCredentials,
  setStudent,
  logout,
  setAuthLoading,
  restoreAuth,
} = authSlice.actions;

export default authSlice.reducer;
