import { useState } from "react";
import { themeStorageKey } from "../lib/app-utils";
import type { SidebarMode, ThemeMode } from "../types";

export function useAppChromeState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("expanded");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    sidebarOpen,
    setSidebarOpen,
    sidebarMode,
    setSidebarMode,
    themeMode,
    setThemeMode,
    busy,
    setBusy,
    error,
    setError,
  };
}
