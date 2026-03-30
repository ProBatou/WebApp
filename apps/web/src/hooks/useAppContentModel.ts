import { useCallback, useRef } from "react";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useAppChromeState } from "./useAppChromeState";
import { useApps } from "./useApps";
import { useAuth } from "./useAuth";
import { useAppContentSupportingData } from "./useAppContentSupportingData";
import { useDashboardIcons } from "./useDashboardIcons";
import { useEditor } from "./useEditor";
import { useGroups } from "./useGroups";
import { useIframes } from "./useIframes";
import { useModals } from "./useModals";
import { usePreferences } from "./usePreferences";
import { useToast } from "./useToast";
import { useAuthenticatedAppShell, type UseAuthenticatedAppShellArgs } from "./useAuthenticatedAppShell";
import { useI18nContext, useTranslation } from "../lib/i18n";
import type { WebAppEntry } from "../types";

export function useAppContentModel() {
  const { t } = useTranslation();
  const { lang, setLang } = useI18nContext();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const {
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
  } = useAppChromeState();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const closeJsonModalRef = useRef<() => void>(() => undefined);
  const setContextMenuRef = useRef<(value: null) => void>(() => undefined);
  const { toasts, pushToast, pushErrorToast, dismissToast } = useToast();

  const {
    apps,
    setApps,
    selectedAppId,
    selectApp,
    reloadApps,
    deleteApp,
    handleReorder,
    resetAppsState,
  } = useApps({
    setBusy,
    setError,
  });
  const {
    groups,
    reloadGroups,
    createGroup,
    updateGroup,
    reorderGroups,
    deleteGroup,
    resetGroups,
  } = useGroups({
    setBusy,
    setError,
  });

  const selectedApp = apps.find((item) => item.id === selectedAppId) ?? null;

  const { mountedIframeIds, iframeReloadTokens, refreshIframeApp, resetIframes } = useIframes({
    apps,
    selectedApp,
  });
  const handleAfterDelete = useCallback(() => {
    setContextMenuRef.current(null);
  }, []);

  const {
    editorMode,
    editorOpen,
    editorState,
    setEditorState,
    iconQuery,
    setIconQuery,
    debouncedIconQuery,
    iconSelectionLocked,
    setIconSelectionLocked,
    closeEditor,
    openCreateEditor,
    openEditEditor,
    handleSaveApp,
    handleDeleteApp,
    setDebouncedIconQuery,
  } = useEditor({
    reloadApps,
    deleteApp,
    setBusy,
    setError,
    onAfterDelete: handleAfterDelete,
  });

  const dashboardIconsState = useDashboardIcons({
    editorOpen,
    apps,
    editorIcon: editorState.icon,
    iconQuery: debouncedIconQuery,
  });

  const mountedIframeApps = mountedIframeIds
    .map((iframeId) => apps.find((item) => item.id === iframeId && item.open_mode === "iframe") ?? null)
    .filter((app): app is WebAppEntry => app !== null);

  const {
    settingsOpen,
    shortcutHelpOpen,
    confirmState,
    openSettings,
    closeSettings,
    openShortcutHelp,
    closeShortcutHelp,
    closeAuxiliaryModals,
    openConfirm,
    closeConfirm,
  } = useModals();

  const clearAppState = useCallback(() => {
    resetAppsState();
    resetGroups();
    resetIframes();
  }, [resetAppsState, resetGroups, resetIframes]);

  const clearUiState = useCallback(() => {
    closeEditor();
    setContextMenuRef.current(null);
    closeJsonModalRef.current();
    closeAuxiliaryModals();
  }, [closeAuxiliaryModals, closeEditor]);

  const {
    user,
    setUser,
    preferences: initialPreferences,
    needsSetup,
    demoMode,
    loading,
    authError,
    credentials,
    inviteToken,
    inviteRole,
    setCredentials,
    handleAuthSubmit,
    handleLogout,
  } = useAuth({
    reloadApps,
    clearAppState,
    clearUiState,
    setError,
    setBusy,
  });

  const { preferences, updatePreferences, previewTheme, clearPreviewTheme } = usePreferences({
    initialPreferences,
    onThemeChange: setThemeMode,
    onLanguageChange: setLang,
  });
  const {
    appStatuses,
    inheritedEditorAccent,
    handleToggleDefaultApp,
    handleUpdatePreferences,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleMoveGroup,
    handleReorderGroups,
    managedUsers,
    reloadUsers,
    handleUpdateUsername,
    handleUpdatePassword,
    handleDeleteSelf,
    handleCreateInvitation,
    handleChangeUserRole,
    handleDeleteUser,
    handleCopyInvitationLink,
    jsonImportMode,
    jsonValue,
    jsonModalError,
    jsonModalInfo,
    jsonFileInputRef,
    setJsonImportMode,
    setJsonValue,
    closeJsonModal,
    handleJsonFileChange,
    handleCopyExportJson,
    handleImportJson,
    prepareExport,
    resetImport,
  } = useAppContentSupportingData({
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
    setError,
    setContextMenu: (value) => setContextMenuRef.current(value),
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
  });
  closeJsonModalRef.current = closeJsonModal;

  const authenticatedShellStateArgs = {
    user,
    sensors,
    busy,
    error,
    sidebarRef,
    setContextMenuRef,
    sidebarOpen,
    setSidebarOpen,
    sidebarMode,
    setSidebarMode,
    lang,
    setLang,
    apps,
    groups,
    selectedAppId,
    selectedApp,
    mountedIframeApps,
    iframeReloadTokens,
    refreshIframeApp,
    reloadUsers,
    reloadGroups,
    deleteApp,
    handleReorder,
    editorOpen,
    editorMode,
    editorState,
    setEditorState,
    iconQuery,
    setIconQuery,
    setDebouncedIconQuery,
    iconSelectionLocked,
    setIconSelectionLocked,
    closeEditor,
    openCreateEditor,
    openEditEditor,
    handleSaveApp,
    handleDeleteApp,
    shortcutHelpOpen,
    settingsOpen,
    closeSettings,
    openSettings,
    closeShortcutHelp,
    openShortcutHelp,
    closeAuxiliaryModals,
    closeJsonModal,
    confirmState,
    closeConfirm,
    t,
  };
  const authenticatedShellDataArgs = {
    managedUsers,
    jsonImportMode,
    setJsonImportMode,
    jsonValue,
    setJsonValue,
    jsonModalError,
    jsonModalInfo,
    jsonFileInputRef,
    preferences,
    updatePreferences,
    previewTheme,
    clearPreviewTheme,
    themeMode,
    setThemeMode,
    dashboardIconsState,
    appStatuses,
    toasts,
    inheritedEditorAccent,
    prepareExport,
    resetImport,
  };
  const authenticatedShellHandlerArgs = {
    handleToggleDefaultApp,
    handleUpdatePreferences,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleMoveGroup,
    handleReorderGroups,
    handleCreateInvitation,
    handleChangeUserRole,
    handleDeleteUser,
    handleCopyInvitationLink,
    handleJsonFileChange,
    handleCopyExportJson,
    handleImportJson,
    handleLogout,
    handleUpdateUsername,
    handleUpdatePassword,
    handleDeleteSelf,
    setError,
    selectApp,
    pushToast,
    pushErrorToast,
    dismissToast,
  };

  const authenticatedShellArgs: UseAuthenticatedAppShellArgs = {
    state: authenticatedShellStateArgs,
    data: authenticatedShellDataArgs,
    handlers: authenticatedShellHandlerArgs,
  };
  const { appShellLayoutProps, toggleThemeMode } = useAuthenticatedAppShell(authenticatedShellArgs);

  const authScreenProps = {
    needsSetup,
    demoMode,
    themeMode,
    busy,
    authError,
    credentials,
    inviteToken,
    inviteRole,
    setCredentials,
    onSubmit: handleAuthSubmit,
    onToggleTheme: toggleThemeMode,
  };

  return {
    t,
    loading,
    error,
    user,
    authScreenProps,
    appShellLayoutProps,
  };
}
