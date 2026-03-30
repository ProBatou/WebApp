import type { Dispatch, SetStateAction } from "react";
import { buildAuthenticatedShellControllerArgs } from "./buildAuthenticatedShellControllerArgs";
import { buildAuthenticatedShellHandlers } from "./buildAuthenticatedShellHandlers";
import { buildAuthenticatedShellLayoutSegments } from "./buildAuthenticatedShellLayoutSegments";
import { useAuthenticatedShellController, type AuthenticatedShellControllerArgs } from "./useAuthenticatedShellController";
import { useAuthenticatedShellLayoutArgs } from "./useAuthenticatedShellLayoutArgs";
import { buildAppShellLayoutProps } from "../lib/build-app-shell-layout-props";
import type { AppShellLayoutProps } from "../components/AppShellLayout";
import type { WebAppEntry } from "../types";

type UseAuthenticatedAppShellStateArgs = Pick<
  AuthenticatedShellControllerArgs,
  | "user"
  | "error"
  | "sidebarRef"
  | "setContextMenuRef"
  | "sidebarOpen"
  | "setSidebarOpen"
  | "setSidebarMode"
  | "apps"
  | "groups"
  | "refreshIframeApp"
  | "reloadUsers"
  | "reloadGroups"
  | "deleteApp"
  | "handleReorder"
  | "editorOpen"
  | "editorState"
  | "setEditorState"
  | "iconQuery"
  | "setIconQuery"
  | "iconSelectionLocked"
  | "closeEditor"
  | "openCreateEditor"
  | "openEditEditor"
  | "shortcutHelpOpen"
  | "settingsOpen"
  | "closeSettings"
  | "openSettings"
  | "closeShortcutHelp"
  | "openShortcutHelp"
  | "closeAuxiliaryModals"
  | "closeJsonModal"
  | "confirmState"
  | "closeConfirm"
> & {
  sensors: AppShellLayoutProps["sensors"];
  busy: boolean;
  sidebarMode: AppShellLayoutProps["sidebarProps"]["sidebarMode"];
  lang: AppShellLayoutProps["sidebarProps"]["lang"];
  setLang: AppShellLayoutProps["sidebarProps"]["setLang"];
  selectedAppId: number | null;
  selectedApp: WebAppEntry | null;
  mountedIframeApps: WebAppEntry[];
  iframeReloadTokens: Record<number, number>;
  editorMode: AppShellLayoutProps["appEditorProps"]["editorMode"];
  setDebouncedIconQuery: (value: string) => void;
  setIconSelectionLocked: Dispatch<SetStateAction<boolean>>;
  handleSaveApp: AppShellLayoutProps["appEditorProps"]["onSubmit"];
  handleDeleteApp: AppShellLayoutProps["appEditorProps"]["onDelete"];
  t: (key: string) => string;
};

type UseAuthenticatedAppShellDataArgs = Pick<
  AuthenticatedShellControllerArgs,
  | "themeMode"
  | "setThemeMode"
  | "dashboardIconsState"
  | "inheritedEditorAccent"
  | "prepareExport"
  | "resetImport"
  | "updatePreferences"
> & {
  managedUsers: AppShellLayoutProps["settingsModalProps"]["users"];
  jsonImportMode: AppShellLayoutProps["settingsModalProps"]["jsonImportMode"];
  setJsonImportMode: AppShellLayoutProps["settingsModalProps"]["setJsonImportMode"];
  jsonValue: string;
  setJsonValue: (value: string) => void;
  jsonModalError: string | null;
  jsonModalInfo: string | null;
  jsonFileInputRef: AppShellLayoutProps["settingsModalProps"]["jsonFileInputRef"];
  preferences: AppShellLayoutProps["settingsModalProps"]["preferences"];
  previewTheme: AppShellLayoutProps["settingsModalProps"]["onPreviewTheme"];
  clearPreviewTheme: () => void;
  appStatuses: AppShellLayoutProps["sidebarProps"]["appStatuses"];
  toasts: AppShellLayoutProps["toastContainerProps"]["toasts"];
};

type UseAuthenticatedAppShellHandlersArgs = Pick<
  AuthenticatedShellControllerArgs,
  "setError" | "selectApp" | "pushErrorToast" | "handleToggleDefaultApp"
> & {
  pushToast: AppShellLayoutProps["settingsModalProps"]["onAccountSuccess"];
  dismissToast: AppShellLayoutProps["toastContainerProps"]["onDismiss"];
  handleUpdatePreferences: AppShellLayoutProps["settingsModalProps"]["onUpdatePreferences"];
  handleCreateGroup: AppShellLayoutProps["settingsModalProps"]["onCreateGroup"];
  handleRenameGroup: AppShellLayoutProps["settingsModalProps"]["onRenameGroup"];
  handleDeleteGroup: AppShellLayoutProps["settingsModalProps"]["onDeleteGroup"];
  handleMoveGroup: AppShellLayoutProps["settingsModalProps"]["onMoveGroup"];
  handleReorderGroups: AppShellLayoutProps["settingsModalProps"]["onReorderGroups"];
  handleCreateInvitation: AppShellLayoutProps["settingsModalProps"]["onCreateInvitation"];
  handleChangeUserRole: AppShellLayoutProps["settingsModalProps"]["onChangeRole"];
  handleDeleteUser: AppShellLayoutProps["settingsModalProps"]["onDeleteUser"];
  handleCopyInvitationLink: AppShellLayoutProps["settingsModalProps"]["onCopyInvitationLink"];
  handleJsonFileChange: AppShellLayoutProps["settingsModalProps"]["onJsonFileChange"];
  handleCopyExportJson: AppShellLayoutProps["settingsModalProps"]["onCopyExport"];
  handleImportJson: AppShellLayoutProps["settingsModalProps"]["onImport"];
  handleLogout: AppShellLayoutProps["settingsModalProps"]["onLogout"];
  handleUpdateUsername: AppShellLayoutProps["settingsModalProps"]["onUpdateUsername"];
  handleUpdatePassword: AppShellLayoutProps["settingsModalProps"]["onUpdatePassword"];
  handleDeleteSelf: AppShellLayoutProps["settingsModalProps"]["onDeleteSelf"];
};

export type UseAuthenticatedAppShellArgs = {
  state: UseAuthenticatedAppShellStateArgs;
  data: UseAuthenticatedAppShellDataArgs;
  handlers: UseAuthenticatedAppShellHandlersArgs;
};

export function useAuthenticatedAppShell({
  state,
  data,
  handlers,
}: UseAuthenticatedAppShellArgs) {
  const {
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
  } = state;
  const {
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
  } = data;
  const {
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
    pushErrorToast,
    pushToast,
    dismissToast,
  } = handlers;

  const shellControllerArgs = buildAuthenticatedShellControllerArgs({
    core: {
      user,
      error,
      sidebarRef,
      setContextMenuRef,
      sidebarOpen,
      setSidebarOpen,
      setSidebarMode,
      apps,
      groups,
    },
    data: {
      refreshIframeApp,
      reloadUsers,
      reloadGroups,
      deleteApp,
      handleReorder,
    },
    editor: {
      editorOpen,
      editorState,
      setEditorState,
      iconQuery,
      setIconQuery,
      iconSelectionLocked,
      closeEditor,
      openCreateEditor,
      openEditEditor,
    },
    modal: {
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
    },
    runtime: {
      themeMode,
      setThemeMode,
      dashboardIconsState,
      pushErrorToast,
      inheritedEditorAccent,
      prepareExport,
      resetImport,
      handleToggleDefaultApp,
      updatePreferences,
      setError,
      selectApp,
    },
  });
  const {
    canManageApps,
    contextMenu,
    draggingAppId,
    dragOutProgress,
    reorderAppsEnabled,
    settingsInitialTab,
    settingsInitialJsonMode,
    draggedApp,
    openCreateEditorFromUi,
    openEditEditorFromUi,
    openContextMenu,
    openSidebarContextMenu,
    handleSelectApp,
    handleDragStart,
    handleDragMove,
    handleDragCancel,
    handleDragEnd,
    handleOpenSettings,
    handleCloseContextMenu,
    handleRefreshContextApp,
    handleEditContextApp,
    handleDeleteContextApp,
    handleToggleDefaultContextApp,
    handleToggleSidebarMode,
    handleToggleReorderApps,
    toggleThemeMode,
    handleCloseConfirm,
    handleConfirmAction,
  } = useAuthenticatedShellController(shellControllerArgs);

  const {
    shellFrameArgs,
    sidebarWorkspaceArgs,
    editorArgs,
    modalAndSettingsStateArgs,
  } = buildAuthenticatedShellLayoutSegments({
    shellFrameArgs: {
      sensors,
      busy,
      busyLabel: t("app.busy"),
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragCancel: handleDragCancel,
      onDragEnd: (event) => void handleDragEnd(event),
      onShellClick: handleCloseContextMenu,
      sidebarRef,
      sidebarOpen,
      setSidebarOpen,
      sidebarMode,
      setSidebarMode,
    },
    sidebarWorkspaceArgs: {
      groups,
      apps,
      selectedAppId,
      selectedApp,
      mountedIframeApps,
      iframeReloadTokens,
      draggingAppId,
      dragOutProgress,
      reorderAppsEnabled,
      themeMode,
      lang,
      setLang,
      contextMenu,
      appStatuses,
      dashboardIconsMetadata: dashboardIconsState.dashboardIconsMetadata,
      dashboardIconsLoading: dashboardIconsState.dashboardIconsLoading,
      dashboardIconsError: dashboardIconsState.dashboardIconsError,
    },
    editorArgs: {
      filteredDashboardIcons: dashboardIconsState.filteredDashboardIcons,
      editorOpen,
      editorMode,
      editorState,
      inheritedEditorAccent,
      setEditorState,
      iconQuery,
      setIconQuery,
      setDebouncedIconQuery,
      iconSelectionLocked,
      setIconSelectionLocked,
    },
    modalAndSettingsStateArgs: {
      confirmState: {
        open: confirmState.open,
        message: confirmState.message,
      },
      shortcutHelpOpen,
      settingsOpen,
      settingsInitialTab,
      settingsInitialJsonMode,
      managedUsers,
      jsonImportMode,
      setJsonImportMode,
      jsonValue,
      setJsonValue,
      jsonModalError,
      jsonModalInfo,
      jsonFileInputRef,
      preferences,
      toasts,
      draggedApp,
    },
  });
  const { primaryHandlers, settingsHandlers } = buildAuthenticatedShellHandlers({
    openCreateEditorFromUi,
    handleOpenSettings,
    openSidebarContextMenu,
    handleToggleReorderApps,
    toggleThemeMode,
    handleSelectApp,
    openEditEditorFromUi,
    openContextMenu,
    handleReorderGroups,
    handleCloseContextMenu,
    handleRefreshContextApp,
    handleEditContextApp,
    handleDeleteContextApp,
    handleToggleDefaultContextApp,
    handleToggleSidebarMode,
    closeEditor,
    handleSaveApp,
    handleDeleteApp,
    handleConfirmAction,
    handleCloseConfirm,
    closeShortcutHelp,
    closeSettings,
    clearPreviewTheme,
    handleCreateGroup,
    handleRenameGroup,
    handleMoveGroup,
    handleDeleteGroup,
    handleCreateInvitation,
    handleCopyInvitationLink,
    handleChangeUserRole,
    handleDeleteUser,
    handleJsonFileChange,
    handleCopyExportJson,
    handleImportJson,
    prepareExport,
    resetImport,
    handleLogout,
    handleUpdatePreferences,
    handleUpdateUsername,
    handleUpdatePassword,
    handleDeleteSelf,
    pushToast,
    pushErrorToast,
    previewTheme,
    dismissToast,
  });

  const appShellLayoutArgs = useAuthenticatedShellLayoutArgs({
    user,
    canManageApps,
    shellFrameArgs,
    sidebarWorkspaceArgs,
    editorArgs,
    modalAndSettingsStateArgs,
    primaryHandlers,
    settingsHandlers,
  });
  const appShellLayoutProps = appShellLayoutArgs ? buildAppShellLayoutProps(appShellLayoutArgs) : null;

  return { appShellLayoutProps, toggleThemeMode };
}
