export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  white: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  card: string;
};

export type ThemePreference = "light" | "dark";

export type AppTheme = {
  mode: ThemePreference;
  colors: ThemeColors;
  statusBar: "light" | "dark";
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const lightColors: ThemeColors = {
  background: "#FFFFFF",
  surface: "#F7FAF8",
  border: "#E5EBE8",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  primary: "#16A34A",
  primaryDark: "#15803D",
  primarySoft: "#ECFDF3",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  success: "#15803D",
  successBg: "#F0FDF4",
  white: "#FFFFFF",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E5EBE8",
  tabInactive: "#9CA3AF",
  card: "#FFFFFF",
};

const darkColors: ThemeColors = {
  background: "#0F1419",
  surface: "#1A2228",
  border: "#2A343E",
  text: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  primary: "#22C55E",
  primaryDark: "#16A34A",
  primarySoft: "#14532D33",
  error: "#F87171",
  errorBg: "#450A0A",
  success: "#4ADE80",
  successBg: "#14532D",
  white: "#FFFFFF",
  tabBar: "#1A2228",
  tabBarBorder: "#2A343E",
  tabInactive: "#6B7280",
  card: "#1A2228",
};

export function getTheme(mode: ThemePreference): AppTheme {
  return {
    mode,
    colors: mode === "dark" ? darkColors : lightColors,
    statusBar: mode === "dark" ? "light" : "dark",
  };
}

/** @deprecated use useTheme() instead */
export const colors = lightColors;
