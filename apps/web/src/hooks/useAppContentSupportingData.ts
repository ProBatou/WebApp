import type { Dispatch, SetStateAction } from "react";
import { useAppStatus } from "./useAppStatus";
import { useJsonImport } from "./useJsonImport";
import { useSettingsActions } from "./useSettingsActions";
import { useUserManagement } from "./useUserManagement";
import type { AuthUser, GroupEntry, ThemeMode, UserPreferences, WebAppEntry } from "../types";

type UseAppContentSupportingDataArgs = {
  apps: WebAppEntry[];
  groups: GroupEntry[];
  selectedAppId: number | null;
  user: AuthUser | null;
  themeMode: ThemeMode;
  preferences: UserPreferences;
  closeEditor: () => void;
  closeAuxiliaryModals: () => void;
  closeConfirm: () => void;
  openConfirm: (message: string, onConfirm: () => void) => void;
  pushToast: (message: string) => number;
  setApps: (items: WebAppEntry[]) => void;
  setBusy: (value: boolean) => void;
  setContextMenu: (value: null) => void;
  setError: (value: string | null) => void;
  selectApp: (appId: number | null) => void;
  createGroup: (name: string) => Promise<GroupEntry>;
  updateGroup: (groupId: number, name: string) => Promise<GroupEntry>;
  reorderGroups: (groupIds: number[]) => Promise<GroupEntry[]>;
  deleteGroup: (groupId: number) => Promise<GroupEntry[]>;
  reloadApps: (preferSelectedId?: number | null) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  clearAppState: () => void;
  clearUiState: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export function useAppContentSupportingData({
  apps,
  groups,
  selectedAppId,
  user,
  themeMode,
  preferences,
  closeEditor,
  closeAuxiliaryModals,
  closeConfirm,
  openConfirm,
  pushToast,
  setApps,
  setBusy,
  setContextMenu,
  setError,
  selectApp,
  createGroup,
  updateGroup,
  reorderGroups,
  deleteGroup,
  reloadApps,
  updatePreferences,
  setUser,
  clearAppState,
  clearUiState,
  t,
}: UseAppContentSupportingDataArgs) {
  const settingsActionsArgs: Parameters<typeof useSettingsActions>[0] = {
    apps,
    groups,
    selectedAppId,
    pushToast,
    setApps,
    setBusy,
    setError,
    setContextMenu,
    selectApp,
    createGroup,
    updateGroup,
    reorderGroups,
    deleteGroup,
    reloadApps,
    updatePreferences,
    t,
  };
  const settingsActions = useSettingsActions(settingsActionsArgs);

  const userManagementArgs: Parameters<typeof useUserManagement>[0] = {
    pushToast,
    setBusy,
    setError,
    setUser,
    clearAppState,
    clearUiState,
    t,
  };
  const userManagement = useUserManagement(userManagementArgs);

  const { appStatuses } = useAppStatus({
    apps,
    enabled: Boolean(user),
  });

  const canManageApps = user?.role === "admin";
  const inheritedEditorAccent = themeMode === "dark"
    ? (preferences.accentColorDark ?? "#df7a42")
    : (preferences.accentColor ?? "#c65c31");

  const jsonImport = useJsonImport({
    apps,
    groups,
    canManageApps,
    closeEditor,
    closeAuxiliaryModals,
    closeConfirm,
    openConfirm,
    pushToast,
    selectApp,
    setApps,
    setBusy,
    setContextMenu,
    setError,
  });

  return {
    appStatuses,
    inheritedEditorAccent,
    ...settingsActions,
    ...userManagement,
    ...jsonImport,
  };
}
