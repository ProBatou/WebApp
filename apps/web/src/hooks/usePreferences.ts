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

export function resolveTheme(userTheme: UserTheme): ThemeMode {
  if (userTheme === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return userTheme;
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }).reduce((acc, val, i) => acc + val * [0.2126, 0.7152, 0.0722][i], 0);
}

function lightenHex(hex: string, factor = 0.35): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `#${rgb.map((c) => Math.min(255, Math.round(c + (255 - c) * factor)).toString(16).padStart(2, "0")).join("")}`;
}

function applyColors(prefs: UserPreferences, themeMode: ThemeMode) {
  const root = document.documentElement;
  const isDarkTheme = themeMode === "dark";
  const defaultText = isDarkTheme ? "#f4ede4" : "#21160e";
  const defaultMuted = isDarkTheme ? "#b7a898" : "#6d5b4b";
  const defaultBorder = isDarkTheme ? "rgba(255, 234, 214, 0.12)" : "rgba(96, 64, 40, 0.14)";
  const defaultLightAccent = "#c65c31";
  const defaultDarkAccent = "#df7a42";
  const defaultLightText = "#21160e";
  const defaultDarkText = "#f4ede4";

  const accentColor = isDarkTheme ? prefs.accentColorDark : prefs.accentColor;
  const sidebarColor = isDarkTheme ? prefs.sidebarColorDark : prefs.sidebarColor;
  const textColor = isDarkTheme ? prefs.textColorDark : prefs.textColor;
  const previewLightAccent = prefs.accentColor ?? defaultLightAccent;
  const previewDarkAccent = prefs.accentColorDark ?? defaultDarkAccent;
  const previewLightText = prefs.textColor ?? defaultLightText;
  const previewDarkText = prefs.textColorDark ?? defaultDarkText;
  const previewLightSource = prefs.sidebarColor;
  const previewDarkSource = prefs.sidebarColorDark;
  const previewLightBackground = previewLightSource ? hexToRgba(previewLightSource, 0.52) : "rgba(255, 255, 255, 0.52)";
  const previewDarkBackground = previewDarkSource ? hexToRgba(previewDarkSource, 0.9) : "rgba(40, 33, 28, 0.9)";
  const previewBorderSource = sidebarColor;

  root.style.setProperty("--preview-light-bg", previewLightBackground);
  root.style.setProperty("--preview-dark-bg", previewDarkBackground);
  root.style.setProperty("--preview-light-accent", previewLightAccent);
  root.style.setProperty("--preview-dark-accent", previewDarkAccent);
  root.style.setProperty("--preview-light-text", previewLightText);
  root.style.setProperty("--preview-dark-text", previewDarkText);
  root.style.setProperty("--preview-light-muted", hexToRgba(previewLightText, 0.64));
  root.style.setProperty("--preview-dark-muted", hexToRgba(previewDarkText, 0.74));
  root.style.setProperty("--color-text", defaultText);
  root.style.setProperty("--text", defaultText);
  root.style.setProperty("--muted", defaultMuted);
  root.style.setProperty("--border", defaultBorder);

  if (textColor) {
    root.style.setProperty("--color-text", textColor);
    root.style.setProperty("--text", textColor);
    root.style.setProperty("--muted", hexToRgba(textColor, isDarkTheme ? 0.74 : 0.64));
    root.style.setProperty("--border", hexToRgba(textColor, isDarkTheme ? 0.2 : 0.16));
  }

  if (previewBorderSource) {
    root.style.setProperty("--preview-border", hexToRgba(previewBorderSource, isDarkTheme ? 0.2 : 0.14));
  } else {
    root.style.removeProperty("--preview-border");
  }

  if (accentColor) {
    root.style.setProperty("--color-secondary", accentColor);
    root.style.setProperty("--accent", accentColor);
    root.style.setProperty("--accent-strong", darkenHex(accentColor));
    root.style.setProperty("--accent-soft", hexToRgba(accentColor, 0.14));
  } else {
    root.style.removeProperty("--color-secondary");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-strong");
    root.style.removeProperty("--accent-soft");
  }

  if (sidebarColor) {
    const lum = relativeLuminance(sidebarColor);
    const isSidebarDark = lum < 0.18;
    const fieldBg = isSidebarDark
      ? hexToRgba(lightenHex(sidebarColor, 0.18), 0.86)
      : hexToRgba(lightenHex(sidebarColor, 0.5), 0.72);
    root.style.setProperty("--color-primary", sidebarColor);
    root.style.setProperty("--panel", sidebarColor);
    root.style.setProperty("--panel-strong", sidebarColor);
    root.style.setProperty("--panel-muted", hexToRgba(sidebarColor, 0.56));
    root.style.setProperty("--menu-bg", hexToRgba(sidebarColor, 0.96));
    root.style.setProperty("--modal-surface", hexToRgba(sidebarColor, 0.92));
    root.style.setProperty("--tile-surface", hexToRgba(sidebarColor, 0.48));
    root.style.setProperty("--ghost-surface", hexToRgba(sidebarColor, 0.62));
    root.style.setProperty("--viewer-surface", hexToRgba(sidebarColor, 0.16));
    root.style.setProperty("--preview-surface", hexToRgba(sidebarColor, 0.52));
    root.style.setProperty("--field-bg", fieldBg);
    if (isSidebarDark && !textColor) {
      root.style.setProperty("--color-text", "#f4ede4");
      root.style.setProperty("--text", "#f4ede4");
      root.style.setProperty("--muted", "rgba(244, 237, 228, 0.54)");
      root.style.setProperty("--border", "rgba(255, 234, 214, 0.12)");
    }
  } else {
    root.style.removeProperty("--color-primary");
    root.style.removeProperty("--panel");
    root.style.removeProperty("--panel-strong");
    root.style.removeProperty("--panel-muted");
    root.style.removeProperty("--menu-bg");
    root.style.removeProperty("--modal-surface");
    root.style.removeProperty("--tile-surface");
    root.style.removeProperty("--ghost-surface");
    root.style.removeProperty("--viewer-surface");
    root.style.removeProperty("--preview-surface");
    root.style.removeProperty("--field-bg");
  }

  if (accentColor) {
    root.style.setProperty("--btn-bg", accentColor);
    root.style.setProperty("--btn-bg-hover", darkenHex(accentColor));
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
  textColor: null,
  accentColorDark: null,
  sidebarColorDark: null,
  textColorDark: null,
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
  const nextPreferencesRef = useRef<UserPreferences>(initialPreferences ?? defaultPreferences);
  const previewThemeRef = useRef<ThemeMode | null>(null);

  useEffect(() => {
    if (!initialPreferences) return;
    setPreferences(initialPreferences);
    nextPreferencesRef.current = initialPreferences;
  }, [initialPreferences]);

  useEffect(() => {
    const resolved = previewThemeRef.current ?? resolveTheme(preferences.theme);
    applyColors(preferences, resolved);
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
      nextPreferencesRef.current = next;
      return next;
    });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void apiFetch("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify(nextPreferencesRef.current),
      });
    }, 500);
  }, []);

  const previewTheme = useCallback((mode: ThemeMode) => {
    previewThemeRef.current = mode;
    onThemeChange(mode);
    applyColors(nextPreferencesRef.current, mode);
  }, [onThemeChange]);

  const clearPreviewTheme = useCallback(() => {
    previewThemeRef.current = null;
    const resolved = resolveTheme(nextPreferencesRef.current.theme);
    onThemeChange(resolved);
    applyColors(nextPreferencesRef.current, resolved);
  }, [onThemeChange]);

  return { preferences, updatePreferences, previewTheme, clearPreviewTheme };
}
