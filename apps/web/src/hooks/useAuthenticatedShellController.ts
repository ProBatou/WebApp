import { useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { useAppShellUi } from "./useAppShellUi";
import { useAppRuntime } from "./useAppRuntime";
import type { ConfirmState } from "./useModals";
import type { AppShellLayoutProps } from "../components/AppShellLayout";
import type { AuthUser, GroupEntry, WebAppEntry } from "../types";

export type AuthenticatedShellControllerArgs = {
  user: AuthUser | null;
  error: string | null;
  sidebarRef: RefObject<HTMLElement | null>;
  setContextMenuRef: MutableRefObject<(value: null) => void>;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setSidebarMode: AppShellLayoutProps["sidebarProps"]["setSidebarMode"];
  apps: AppShellLayoutProps["sidebarProps"]["apps"];
  groups: AppShellLayoutProps["sidebarProps"]["groups"];
  refreshIframeApp: (app: WebAppEntry) => void;
  reloadUsers: () => Promise<void>;
  reloadGroups: () => Promise<unknown>;
  deleteApp: (appId: number) => Promise<void>;
  handleReorder: (
    event: DragEndEvent,
    isDroppedOutsideSidebar: (event: DragEndEvent) => boolean,
    groups: GroupEntry[]
  ) => Promise<void>;
  editorOpen: boolean;
  editorState: AppShellLayoutProps["appEditorProps"]["editorState"];
  setEditorState: AppShellLayoutProps["appEditorProps"]["setEditorState"];
  iconQuery: string;
  setIconQuery: (value: string) => void;
  iconSelectionLocked: boolean;
  closeEditor: () => void;
  openCreateEditor: () => void;
  openEditEditor: (app: WebAppEntry) => void;
  shortcutHelpOpen: boolean;
  settingsOpen: boolean;
  closeSettings: () => void;
  openSettings: () => void;
  closeShortcutHelp: () => void;
  openShortcutHelp: () => void;
  closeAuxiliaryModals: () => void;
  closeJsonModal: () => void;
  confirmState: ConfirmState;
  closeConfirm: () => void;
  themeMode: AppShellLayoutProps["sidebarProps"]["themeMode"];
  setThemeMode: Dispatch<SetStateAction<AppShellLayoutProps["sidebarProps"]["themeMode"]>>;
  dashboardIconsState: {
    dashboardIcons: string[];
    dashboardIconsMetadata: AppShellLayoutProps["sidebarProps"]["dashboardIconsMetadata"];
    dashboardIconsLoading: boolean;
    dashboardIconsError: string | null;
    filteredDashboardIcons: AppShellLayoutProps["appEditorProps"]["filteredDashboardIcons"];
  };
  pushErrorToast: AppShellLayoutProps["settingsModalProps"]["onAccountError"];
  inheritedEditorAccent: string;
  prepareExport: AppShellLayoutProps["settingsModalProps"]["onPrepareExport"];
  resetImport: AppShellLayoutProps["settingsModalProps"]["onResetImport"];
  handleToggleDefaultApp: (app: WebAppEntry) => Promise<void>;
  updatePreferences: (patch: Partial<AppShellLayoutProps["settingsModalProps"]["preferences"]>) => void;
  setError: Dispatch<SetStateAction<string | null>>;
  selectApp: (appId: number | null) => void;
};

export function useAuthenticatedShellController({
  user,
  error,
  sidebarRef,
  setContextMenuRef,
  sidebarOpen,
  setSidebarOpen,
  setSidebarMode,
  apps,
  groups,
  refreshIframeApp,
  reloadUsers,
  reloadGroups,
  deleteApp,
  handleReorder,
  editorOpen,
  editorState,
  setEditorState,
  iconQuery,
  setIconQuery,
  iconSelectionLocked,
  closeEditor,
  openCreateEditor,
  openEditEditor,
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
}: AuthenticatedShellControllerArgs) {
  const canManageApps = user?.role === "admin";

  const {
    contextMenu,
    draggingAppId,
    dragOutProgress,
    reorderAppsEnabled,
    settingsInitialTab,
    settingsInitialJsonMode,
    draggedApp,
    setContextMenu,
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
  } = useAppShellUi({
    userPresent: Boolean(user),
    userRole: user?.role ?? null,
    canManageApps,
    editorOpen,
    shortcutHelpOpen,
    settingsOpen,
    apps,
    groups,
    sidebarRef,
    closeEditor,
    closeSettings,
    closeShortcutHelp,
    closeJsonModal,
    closeAuxiliaryModals,
    openShortcutHelp,
    openSettings,
    openCreateEditor,
    openEditEditor,
    prepareExport,
    resetImport,
    reloadUsers,
    refreshIframeApp,
    selectApp,
    setSidebarOpen,
    setSidebarMode,
    setEditorState,
    inheritedEditorAccent,
    handleDeleteAppFromUi: async (appId) => {
      await deleteApp(appId);
      closeEditor();
      setContextMenu(null);
    },
    handleToggleDefaultApp,
    handleReorder,
  });
  setContextMenuRef.current = setContextMenu;

  const normalizedIconQuery = iconQuery.trim().toLowerCase();
  const { toggleThemeMode } = useAppRuntime({
    userPresent: Boolean(user),
    sidebarOpen,
    editorOpen,
    iconSelectionLocked,
    normalizedIconQuery,
    dashboardIcons: dashboardIconsState.dashboardIcons,
    editorIcon: editorState.icon,
    themeMode,
    error,
    setThemeMode,
    setError,
    setContextMenu,
    setEditorState,
    pushErrorToast,
    reloadGroups,
    updatePreferences,
  });

  const handleCloseConfirm = useCallback(() => {
    closeConfirm();
  }, [closeConfirm]);

  const handleConfirmAction = useCallback(() => {
    confirmState.onConfirm?.();
  }, [confirmState]);

  return {
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
  };
}
