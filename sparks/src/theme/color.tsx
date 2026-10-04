// color.tsx

import { Appearance } from "react-native";

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;

  background: string;
  card: string;
  surface: string;

  buttonPrimary: string;
  buttonSecondary: string;
  buttonText: string;

  textPrimary: string;
  textSecondary: string;

  border: string;
  shadow: string;

  error: string;
  success: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
}

/* ================= BRAND COLORS ================= */

const BRAND = {
  electricBlue: "#0A4D9C",
  cyanGlow: "#1EC8FF",
  lightningYellow: "#FFB300",
  deepNavy: "#081B33",
};

/* ================= LIGHT THEME ================= */

const LightTheme: Theme = {
  mode: "light",
  colors: {
    /* Brand */
    primary: BRAND.lightningYellow,     // 🔥 Now main color
    secondary: BRAND.electricBlue,
    accent: BRAND.lightningYellow,

    /* Layout */
    background: "#FFF9E6",              // Soft yellow tint
    card: "#FFFFFF",
    surface: "#FFF3CC",

    /* Buttons */
    buttonPrimary: BRAND.lightningYellow,
    buttonSecondary: "#FFE8A3",
    buttonText: "#081B33",              // Dark text for contrast

    /* Text */
    textPrimary: "#1E293B",
    textSecondary: "#475569",

    /* UI */
    border: "#FFE0A3",
    shadow: "rgba(255,179,0,0.35)",     // Yellow glow

    /* Status */
    error: "#EF4444",
    success: "#22C55E",
  },
};

/* ================= DARK THEME ================= */

const DarkTheme: Theme = {
  mode: "dark",
  colors: {
    /* Brand */
    primary: BRAND.lightningYellow,
    secondary: BRAND.cyanGlow,
    accent: BRAND.lightningYellow,

    /* Layout */
    background: BRAND.deepNavy,
    card: "#102944",
    surface: "#14365A",

    /* Buttons */
    buttonPrimary: BRAND.lightningYellow,
    buttonSecondary: "#3A2A00",
    buttonText: "#081B33",

    /* Text */
    textPrimary: "#FFFFFF",
    textSecondary: "#BBD6FF",

    /* UI */
    border: "#2A4D7A",
    shadow: "rgba(255,179,0,0.5)",

    /* Status */
    error: "#F87171",
    success: "#4ADE80",
  },
};

/* ================= AUTO DETECT ================= */

const systemTheme = Appearance.getColorScheme();

export const theme: Theme =
  systemTheme === "dark" ? DarkTheme : LightTheme;

export { DarkTheme, LightTheme };
