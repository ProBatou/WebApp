import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import type { SupportedLanguage } from "../lib/i18n";
import type { ThemeMode, UserPreferences, UserTheme } from "../types";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function darkenHex(hex: string, factor = 0.15): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `#${rgb.map((c) => Math.max(0, Math.round(c * (1 - factor))).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function resolveTheme(userTheme: UserTheme): ThemeMode {
  if (userTheme === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return userTheme;
}

function applyColors(prefs: UserPreferences) {
  const root = document.documentElement;

  if (prefs.accentColor) {
    root.style.setProperty("--accent", prefs.accentColor);
    root.style.setProperty("--accent-strong", darkenHex(prefs.accentColor));
    root.style.setProperty("--accent-soft", hexToRgba(prefs.accentColor, 0.14));
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-strong");
    root.style.removeProperty("--accent-soft");
  }

  if (prefs.sidebarColor) {
    root.style.setProperty("--panel", prefs.sidebarColor);
    root.style.setProperty("--panel-strong", darkenHex(prefs.sidebarColor, 0.05));
  } else {
    root.style.removeProperty("--panel");
    root.style.removeProperty("--panel-strong");
  }

  if (prefs.buttonColor) {
    root.style.setProperty("--btn-bg", prefs.buttonColor);
    root.style.setProperty("--btn-bg-hover", darkenHex(prefs.buttonColor));
  } else {
    root.style.removeProperty("--btn-bg");
    root.style.removeProperty("--btn-bg-hover");
  }
}

const defaultPreferences: UserPreferences = {
  theme: "auto",
  language: "auto",
  defaultAppId: null,
  accentColor: null,
  sidebarColor: null,
  buttonColor: null,
};

export function usePreferences({
  initialPreferences,
  onThemeChange,
  onLanguageChange,
}: {
  initialPreferences: UserPreferences | null;
  onThemeChange: (theme: ThemeMode) => void;
  onLanguageChange: (lang: SupportedLanguage) => void;
}) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    initialPreferences ?? defaultPreferences
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!initialPreferences) return;
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  useEffect(() => {
    applyColors(preferences);

    const resolved = resolveTheme(preferences.theme);
    onThemeChange(resolved);

    if (preferences.language !== "auto") {
      const supported: SupportedLanguage[] = ["en", "fr", "de", "es"];
      const lang = supported.includes(preferences.language as SupportedLanguage)
        ? (preferences.language as SupportedLanguage)
        : "en";
      onLanguageChange(lang);
    }
  }, [preferences, onThemeChange, onLanguageChange]);

  useEffect(() => {
    if (preferences.theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => onThemeChange(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preferences.theme, onThemeChange]);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        void apiFetch("/api/user/preferences", {
          method: "PUT",
          body: JSON.stringify(patch),
        });
      }, 500);

      return next;
    });
  }, []);

  return { preferences, updatePreferences };
}
