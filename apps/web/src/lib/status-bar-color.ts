import type { ThemeMode } from "../types";

const DEFAULT_SHELL_SURFACE: Record<ThemeMode, string> = {
  light: "#fff8ee",
  dark: "#211b17",
};

export function resolveStatusBarColor({
  themeMode,
  userShellSurfaceColor,
  shellSurfaceColor,
}: {
  themeMode: ThemeMode;
  userShellSurfaceColor: string | null;
  shellSurfaceColor: string;
}) {
  const normalizedUserColor = userShellSurfaceColor?.trim() ?? "";
  const normalizedShellColor = shellSurfaceColor.trim();

  if (normalizedUserColor && !normalizedUserColor.startsWith("var(")) {
    return normalizedUserColor;
  }

  if (normalizedShellColor && !normalizedShellColor.startsWith("var(")) {
    return normalizedShellColor;
  }

  return DEFAULT_SHELL_SURFACE[themeMode];
}
