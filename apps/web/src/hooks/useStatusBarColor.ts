import { useEffect } from "react";
import { resolveStatusBarColor } from "../lib/status-bar-color";
import type { ThemeMode } from "../types";

function ensureThemeColorMeta() {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }

  return meta;
}

function getShellSurfaceColor() {
  return window.getComputedStyle(document.documentElement).getPropertyValue("--color-primary");
}

export function useStatusBarColor({
  themeMode,
  userShellSurfaceColor,
}: {
  themeMode: ThemeMode;
  userShellSurfaceColor: string | null;
}) {
  useEffect(() => {
    const color = resolveStatusBarColor({
      themeMode,
      userShellSurfaceColor,
      shellSurfaceColor: getShellSurfaceColor(),
    });

    ensureThemeColorMeta().setAttribute("content", color);
  }, [themeMode, userShellSurfaceColor]);
}
