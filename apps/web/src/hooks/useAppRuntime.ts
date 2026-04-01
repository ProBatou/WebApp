import { useCallback, useEffect, useLayoutEffect, type Dispatch, type SetStateAction } from "react";
import { getSuggestedDashboardIcon, themeStorageKey } from "../lib/app-utils";
import type { AppEditorState, ThemeMode, UserPreferences } from "../types";

export function useAppRuntime({
  userPresent,
  sidebarOpen,
  editorOpen,
  iconSelectionLocked,
  normalizedIconQuery,
  dashboardIcons,
  editorIcon,
  themeMode,
  error,
  setThemeMode,
  setError,
  setContextMenu,
  setEditorState,
  pushErrorToast,
  reloadGroups,
  updatePreferences,
}: {
  userPresent: boolean;
  sidebarOpen: boolean;
  editorOpen: boolean;
  iconSelectionLocked: boolean;
  normalizedIconQuery: string;
  dashboardIcons: string[];
  editorIcon: string;
  themeMode: ThemeMode;
  error: string | null;
  setThemeMode: Dispatch<SetStateAction<ThemeMode>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setContextMenu: (value: null) => void;
  setEditorState: Dispatch<SetStateAction<AppEditorState>>;
  pushErrorToast: (message: string) => void;
  reloadGroups: () => Promise<unknown>;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
}) {
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!sidebarOpen) {
      setContextMenu(null);
    }
  }, [setContextMenu, sidebarOpen]);

  useEffect(() => {
    if (!userPresent) {
      return;
    }

    void reloadGroups();
  }, [reloadGroups, userPresent]);

  useEffect(() => {
    if (!userPresent || !error) {
      return;
    }

    pushErrorToast(error);
    setError(null);
  }, [error, pushErrorToast, setError, userPresent]);

  useEffect(() => {
    if (!editorOpen || iconSelectionLocked || !normalizedIconQuery) {
      return;
    }

    const nextIcon = getSuggestedDashboardIcon(normalizedIconQuery, dashboardIcons);
    if (!nextIcon || nextIcon === editorIcon) {
      return;
    }

    setEditorState((current) => ({ ...current, icon: nextIcon }));
  }, [dashboardIcons, editorIcon, editorOpen, iconSelectionLocked, normalizedIconQuery, setEditorState]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((current) => {
      const next = current === "light" ? "dark" : "light";
      updatePreferences({ theme: next });
      return next;
    });
  }, [setThemeMode, updatePreferences]);

  return { toggleThemeMode };
}
