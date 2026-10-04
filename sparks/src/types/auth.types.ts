// ─── Student Auth Types ───

export interface Student {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthState {
  student: Student | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  fcmToken?: string;
  deviceLabel?: string;
}

/** Body for POST /api/students/fcm-token – only FCM (Firebase) token is saved. */
export interface SaveFcmTokenRequest {
  fcmToken: string;
  deviceLabel?: string;
}

export interface SendOTPRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  name: string;
  password: string;
  fcmToken?: string;
  deviceLabel?: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string; value?: unknown }[];
}

export interface AuthResponse {
  student: Student;
  token: string;
}

export interface OTPResponse {
  email: string;
  expiresIn: string;
}

/** Response from GET /api/students/profile */
export interface StudentProfile {
  image: string | null;
  name: string;
  email: string;
  phone: string | null;
  enrolledCourseCount: number;
  avgTestScore: number;
  completedTestCount: number;
}

/** Body for PATCH /api/students/me */
export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatarKey?: string;
}

/** Body for POST /api/students/change-password */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Body for POST /api/students/delete-account */
export interface DeleteAccountRequest {
  email: string;
  message: string;
}

/** Help chat message */
export interface HelpMessage {
  _id: string;
  from: "student" | "admin";
  text: string;
  createdAt: string;
}

/** GET /api/students/help response */
export interface HelpConversationResponse {
  messages: HelpMessage[];
}

/** Body for POST /api/students/help */
export interface SendHelpMessageRequest {
  text: string;
}
