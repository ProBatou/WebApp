import type { Dispatch, RefObject, SetStateAction } from "react";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import type { AppShellLayoutProps } from "../components/AppShellLayout";
import type { ContextMenuState, OidcAdminConfig, OidcConfigSavePayload, SidebarMode, ThemeMode, UserPreferences, WebAppEntry } from "../types";

export type BuildAppShellLayoutPropsArgs = {
  sensors: AppShellLayoutProps["sensors"];
  onDragStart: (event: DragStartEvent) => void;
  onDragMove: (event: DragMoveEvent) => void;
  onDragCancel: AppShellLayoutProps["onDragCancel"];
  onDragEnd: (event: DragEndEvent) => void;
  busy: boolean;
  busyLabel: string;
  onShellClick: () => void;
  sidebarRef: RefObject<HTMLElement | null>;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  sidebarMode: SidebarMode;
  setSidebarMode: Dispatch<SetStateAction<SidebarMode>>;
  userName: string;
  userAuthProvider: AppShellLayoutProps["settingsModalProps"]["authProvider"];
  canManageApps: boolean;
  groups: AppShellLayoutProps["sidebarProps"]["groups"];
  apps: AppShellLayoutProps["sidebarProps"]["apps"];
  selectedAppId: number | null;
  selectedApp: WebAppEntry | null;
  mountedIframeApps: WebAppEntry[];
  iframeReloadTokens: Record<number, number>;
  draggingAppId: number | null;
  dragOutProgress: number;
  reorderAppsEnabled: boolean;
  themeMode: ThemeMode;
  lang: AppShellLayoutProps["sidebarProps"]["lang"];
  setLang: AppShellLayoutProps["sidebarProps"]["setLang"];
  contextMenu: ContextMenuState;
  appStatuses: AppShellLayoutProps["sidebarProps"]["appStatuses"];
  dashboardIconsMetadata: AppShellLayoutProps["sidebarProps"]["dashboardIconsMetadata"];
  dashboardIconsLoading: boolean;
  dashboardIconsError: string | null;
  filteredDashboardIcons: AppShellLayoutProps["appEditorProps"]["filteredDashboardIcons"];
  editorOpen: boolean;
  editorMode: AppShellLayoutProps["appEditorProps"]["editorMode"];
  editorState: AppShellLayoutProps["appEditorProps"]["editorState"];
  inheritedEditorAccent: string;
  setEditorState: AppShellLayoutProps["appEditorProps"]["setEditorState"];
  iconQuery: string;
  setIconQuery: (value: string) => void;
  setDebouncedIconQuery: (value: string) => void;
  iconSelectionLocked: boolean;
  setIconSelectionLocked: Dispatch<SetStateAction<boolean>>;
  confirmState: {
    open: boolean;
    message: string;
  };
  shortcutHelpOpen: boolean;
  settingsOpen: boolean;
  settingsInitialTab: AppShellLayoutProps["settingsModalProps"]["initialTab"];
  settingsInitialJsonMode: AppShellLayoutProps["settingsModalProps"]["initialJsonMode"];
  managedUsers: AppShellLayoutProps["settingsModalProps"]["users"];
  currentUserId: AppShellLayoutProps["settingsModalProps"]["currentUserId"];
  jsonImportMode: AppShellLayoutProps["settingsModalProps"]["jsonImportMode"];
  setJsonImportMode: AppShellLayoutProps["settingsModalProps"]["setJsonImportMode"];
  jsonValue: string;
  setJsonValue: (value: string) => void;
  jsonModalError: string | null;
  jsonModalInfo: string | null;
  jsonFileInputRef: AppShellLayoutProps["settingsModalProps"]["jsonFileInputRef"];
  preferences: UserPreferences;
  toasts: AppShellLayoutProps["toastContainerProps"]["toasts"];
  draggedApp: AppShellLayoutProps["dragOverlayTileProps"]["app"];
  onOpenSidebarContextMenu: AppShellLayoutProps["sidebarProps"]["onOpenSidebarContextMenu"];
  onOpenCreateEditor: AppShellLayoutProps["sidebarProps"]["onOpenCreateEditor"];
  onOpenSettings: AppShellLayoutProps["sidebarProps"]["onOpenSettings"];
  onToggleReorderApps: AppShellLayoutProps["sidebarProps"]["onToggleReorderApps"];
  onToggleTheme: () => void;
  onSelectApp: AppShellLayoutProps["sidebarProps"]["onSelectApp"];
  onEditApp: (app: WebAppEntry) => void;
  onOpenContextMenu: AppShellLayoutProps["sidebarProps"]["onOpenContextMenu"];
  onReorderGroups: AppShellLayoutProps["sidebarProps"]["onReorderGroups"];
  onCloseContextMenu: () => void;
  onRefreshContextApp: AppShellLayoutProps["contextMenuProps"]["onRefresh"];
  onEditContextApp: AppShellLayoutProps["contextMenuProps"]["onEdit"];
  onDeleteContextApp: AppShellLayoutProps["contextMenuProps"]["onDelete"];
  onToggleDefaultContextApp: AppShellLayoutProps["contextMenuProps"]["onToggleDefault"];
  onToggleSidebarMode: AppShellLayoutProps["contextMenuProps"]["onToggleSidebarMode"];
  onImportSettings: () => void;
  onExportSettings: () => void;
  onCloseEditor: AppShellLayoutProps["appEditorProps"]["onClose"];
  onSubmitEditor: AppShellLayoutProps["appEditorProps"]["onSubmit"];
  onResetEditor: AppShellLayoutProps["appEditorProps"]["onReset"];
  onDeleteEditor: AppShellLayoutProps["appEditorProps"]["onDelete"];
  onConfirmAction: () => void;
  onCancelConfirm: () => void;
  onCloseShortcutHelp: () => void;
  onCloseSettings: () => void;
  onCreateGroup: AppShellLayoutProps["settingsModalProps"]["onCreateGroup"];
  onRenameGroup: AppShellLayoutProps["settingsModalProps"]["onRenameGroup"];
  onMoveGroup: AppShellLayoutProps["settingsModalProps"]["onMoveGroup"];
  onDeleteGroup: AppShellLayoutProps["settingsModalProps"]["onDeleteGroup"];
  onCreateInvitation: AppShellLayoutProps["settingsModalProps"]["onCreateInvitation"];
  onCopyInvitationLink: AppShellLayoutProps["settingsModalProps"]["onCopyInvitationLink"];
  onChangeRole: AppShellLayoutProps["settingsModalProps"]["onChangeRole"];
  onDeleteUser: AppShellLayoutProps["settingsModalProps"]["onDeleteUser"];
  onJsonFileChange: AppShellLayoutProps["settingsModalProps"]["onJsonFileChange"];
  onCopyExport: AppShellLayoutProps["settingsModalProps"]["onCopyExport"];
  onImportJson: AppShellLayoutProps["settingsModalProps"]["onImport"];
  onPrepareExport: AppShellLayoutProps["settingsModalProps"]["onPrepareExport"];
  onResetImport: AppShellLayoutProps["settingsModalProps"]["onResetImport"];
  onLogout: AppShellLayoutProps["settingsModalProps"]["onLogout"];
  onUpdatePreferences: AppShellLayoutProps["settingsModalProps"]["onUpdatePreferences"];
  onUpdateUsername: AppShellLayoutProps["settingsModalProps"]["onUpdateUsername"];
  onUpdatePassword: AppShellLayoutProps["settingsModalProps"]["onUpdatePassword"];
  onDeleteSelf: AppShellLayoutProps["settingsModalProps"]["onDeleteSelf"];
  onAccountSuccess: AppShellLayoutProps["settingsModalProps"]["onAccountSuccess"];
  onAccountError: AppShellLayoutProps["settingsModalProps"]["onAccountError"];
  onPreviewTheme: AppShellLayoutProps["settingsModalProps"]["onPreviewTheme"];
  oidcConfig: OidcAdminConfig | null;
  onSaveOidcConfig: (config: OidcConfigSavePayload) => Promise<void>;
  onResetOidcConfig: AppShellLayoutProps["settingsModalProps"]["onResetOidcConfig"];
  onDismissToast: AppShellLayoutProps["toastContainerProps"]["onDismiss"];
};

export function buildAppShellLayoutProps({
  sensors,
  onDragStart,
  onDragMove,
  onDragCancel,
  onDragEnd,
  busy,
  busyLabel,
  onShellClick,
  sidebarRef,
  sidebarOpen,
  setSidebarOpen,
  sidebarMode,
  setSidebarMode,
  userName,
  userAuthProvider,
  canManageApps,
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
  dashboardIconsMetadata,
  dashboardIconsLoading,
  dashboardIconsError,
  filteredDashboardIcons,
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
  confirmState,
  shortcutHelpOpen,
  settingsOpen,
  settingsInitialTab,
  settingsInitialJsonMode,
  managedUsers,
  currentUserId,
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
  onOpenSidebarContextMenu,
  onOpenCreateEditor,
  onOpenSettings,
  onToggleReorderApps,
  onToggleTheme,
  onSelectApp,
  onOpenContextMenu,
  onReorderGroups,
  onCloseContextMenu,
  onRefreshContextApp,
  onEditContextApp,
  onDeleteContextApp,
  onToggleDefaultContextApp,
  onToggleSidebarMode,
  onImportSettings,
  onExportSettings,
  onCloseEditor,
  onSubmitEditor,
  onResetEditor,
  onDeleteEditor,
  onConfirmAction,
  onCancelConfirm,
  onCloseShortcutHelp,
  onCloseSettings,
  onCreateGroup,
  onRenameGroup,
  onMoveGroup,
  onDeleteGroup,
  onCreateInvitation,
  onCopyInvitationLink,
  onChangeRole,
  onDeleteUser,
  onJsonFileChange,
  onCopyExport,
  onImportJson,
  onPrepareExport,
  onResetImport,
  onLogout,
  onUpdatePreferences,
  onUpdateUsername,
  onUpdatePassword,
  onDeleteSelf,
  onAccountSuccess,
  onAccountError,
  onPreviewTheme,
  oidcConfig,
  onSaveOidcConfig,
  onResetOidcConfig,
  onDismissToast,
}: BuildAppShellLayoutPropsArgs): AppShellLayoutProps {
  return {
    sensors,
    onDragStart,
    onDragMove,
    onDragCancel,
    onDragEnd,
    busy,
    busyLabel,
    onShellClick,
    sidebarProps: buildSidebarProps({
      sidebarRef,
      sidebarOpen,
      setSidebarOpen,
      sidebarMode,
      setSidebarMode,
      userName,
      canManageApps,
      groups,
      apps,
      selectedAppId,
      draggingAppId,
      dragOutProgress,
      reorderAppsEnabled,
      themeMode,
      dashboardIconsMetadata,
      contextMenu,
      appStatuses,
      onOpenSidebarContextMenu,
      onOpenCreateEditor,
      onOpenSettings,
      onToggleReorderApps,
      onToggleTheme,
      lang,
      setLang,
      onUpdatePreferences,
      onSelectApp,
      onOpenContextMenu,
      onReorderGroups,
    }),
    workspaceProps: buildWorkspaceProps({
      selectedApp,
      mountedIframeApps,
      iframeReloadTokens,
    }),
    contextMenuProps: buildContextMenuProps({
      contextMenu,
      sidebarMode,
      canManageApps,
      onCloseContextMenu,
      onRefreshContextApp,
      onEditContextApp,
      onDeleteContextApp,
      onToggleDefaultContextApp,
      onOpenCreateEditor,
      onImportSettings,
      onExportSettings,
      onToggleSidebarMode,
    }),
    appEditorProps: buildAppEditorProps({
      editorOpen,
      canManageApps,
      busy,
      editorMode,
      editorState,
      inheritedEditorAccent,
      setEditorState,
      iconQuery,
      setIconQuery,
      setDebouncedIconQuery,
      iconSelectionLocked,
      setIconSelectionLocked,
      dashboardIconsMetadata,
      dashboardIconsLoading,
      dashboardIconsError,
      filteredDashboardIcons,
      groups,
      themeMode,
      onCloseEditor,
      onSubmitEditor,
      onResetEditor,
      onDeleteEditor,
    }),
    confirmModalProps: buildConfirmModalProps({
      confirmState,
      onConfirmAction,
      onCancelConfirm,
    }),
    shortcutHelpModalProps: buildShortcutHelpModalProps({
      shortcutHelpOpen,
      onCloseShortcutHelp,
    }),
    settingsModalProps: buildSettingsModalProps({
      settingsOpen,
      busy,
      canManageApps,
      currentUserId,
      userName,
      userAuthProvider,
      groups,
      managedUsers,
      apps,
      settingsInitialTab,
      settingsInitialJsonMode,
      jsonImportMode,
      setJsonImportMode,
      jsonValue,
      setJsonValue,
      jsonModalError,
      jsonModalInfo,
      jsonFileInputRef,
      onCloseSettings,
      onCreateGroup,
      onRenameGroup,
      onMoveGroup,
      onReorderGroups,
      onDeleteGroup,
      onCreateInvitation,
      onCopyInvitationLink,
      onChangeRole,
      onDeleteUser,
      onJsonFileChange,
      onCopyExport,
      onImportJson,
      onPrepareExport,
      onResetImport,
      onLogout,
      preferences,
      themeMode,
      dashboardIconsMetadata,
      onUpdatePreferences,
      onUpdateUsername,
      onUpdatePassword,
      onDeleteSelf,
      onAccountSuccess,
      onAccountError,
      onPreviewTheme,
      oidcConfig,
      onSaveOidcConfig,
      onResetOidcConfig,
    }),
    toastContainerProps: buildToastContainerProps({
      toasts,
      onDismissToast,
    }),
    dragOverlayTileProps: buildDragOverlayTileProps({
      draggedApp,
      sidebarMode,
      themeMode,
      dashboardIconsMetadata,
      dragOutProgress,
      appStatuses,
    }),
  };
}

function buildSidebarProps({
  sidebarRef,
  sidebarOpen,
  setSidebarOpen,
  sidebarMode,
  setSidebarMode,
  userName,
  canManageApps,
  groups,
  apps,
  selectedAppId,
  draggingAppId,
  dragOutProgress,
  reorderAppsEnabled,
  themeMode,
  dashboardIconsMetadata,
  contextMenu,
  appStatuses,
  onOpenSidebarContextMenu,
  onOpenCreateEditor,
  onOpenSettings,
  onToggleReorderApps,
  onToggleTheme,
  lang,
  setLang,
  onUpdatePreferences,
  onSelectApp,
  onOpenContextMenu,
  onReorderGroups,
}: Pick<
  BuildAppShellLayoutPropsArgs,
  | "sidebarRef"
  | "sidebarOpen"
  | "setSidebarOpen"
  | "sidebarMode"
  | "setSidebarMode"
  | "userName"
  | "canManageApps"
  | "groups"
  | "apps"
  | "selectedAppId"
  | "draggingAppId"
  | "dragOutProgress"
  | "reorderAppsEnabled"
  | "themeMode"
  | "dashboardIconsMetadata"
  | "contextMenu"
  | "appStatuses"
  | "onOpenSidebarContextMenu"
  | "onOpenCreateEditor"
  | "onOpenSettings"
  | "onToggleReorderApps"
  | "onToggleTheme"
  | "lang"
  | "setLang"
  | "onUpdatePreferences"
  | "onSelectApp"
  | "onOpenContextMenu"
  | "onReorderGroups"
>): AppShellLayoutProps["sidebarProps"] {
  return {
    sidebarRef,
    sidebarOpen,
    setSidebarOpen,
    sidebarMode,
    setSidebarMode,
    userName,
    canManageApps,
    groups,
    apps,
    selectedAppId,
    draggingAppId,
    dragOutProgress,
    reorderAppsEnabled,
    themeMode,
    dashboardIconsMetadata,
    contextMenu,
    appStatuses,
    onOpenSidebarContextMenu,
    onOpenCreateEditor,
    onOpenSettings,
    onToggleReorderApps,
    onToggleTheme,
    lang,
    setLang: (nextLang) => {
      setLang(nextLang);
      onUpdatePreferences({ language: nextLang });
    },
    onSelectApp,
    onOpenContextMenu,
    onReorderGroups,
  };
}

function buildWorkspaceProps({
  selectedApp,
  mountedIframeApps,
  iframeReloadTokens,
}: Pick<BuildAppShellLayoutPropsArgs, "selectedApp" | "mountedIframeApps" | "iframeReloadTokens">): AppShellLayoutProps["workspaceProps"] {
  return {
    selectedApp,
    mountedIframeApps,
    iframeReloadTokens,
  };
}

function buildContextMenuProps({
  contextMenu,
  sidebarMode,
  canManageApps,
  onCloseContextMenu,
  onRefreshContextApp,
  onEditContextApp,
  onDeleteContextApp,
  onToggleDefaultContextApp,
  onOpenCreateEditor,
  onImportSettings,
  onExportSettings,
  onToggleSidebarMode,
}: Pick<
  BuildAppShellLayoutPropsArgs,
  | "contextMenu"
  | "sidebarMode"
  | "canManageApps"
  | "onCloseContextMenu"
  | "onRefreshContextApp"
  | "onEditContextApp"
  | "onDeleteContextApp"
  | "onToggleDefaultContextApp"
  | "onOpenCreateEditor"
  | "onImportSettings"
  | "onExportSettings"
  | "onToggleSidebarMode"
>): AppShellLayoutProps["contextMenuProps"] {
  return {
    contextMenu,
    sidebarMode,
    canManageApps,
    onClose: onCloseContextMenu,
    onRefresh: onRefreshContextApp,
    onEdit: onEditContextApp,
    onDelete: onDeleteContextApp,
    onToggleDefault: onToggleDefaultContextApp,
    onCreate: onOpenCreateEditor,
    onImport: onImportSettings,
    onExport: onExportSettings,
    onToggleSidebarMode,
  };
}

function buildAppEditorProps({
  editorOpen,
  canManageApps,
  busy,
  editorMode,
  editorState,
  inheritedEditorAccent,
  setEditorState,
  iconQuery,
  setIconQuery,
  setDebouncedIconQuery,
  iconSelectionLocked,
  setIconSelectionLocked,
  dashboardIconsMetadata,
  dashboardIconsLoading,
  dashboardIconsError,
  filteredDashboardIcons,
  groups,
  themeMode,
  onCloseEditor,
  onSubmitEditor,
  onResetEditor,
  onDeleteEditor,
}: Pick<
  BuildAppShellLayoutPropsArgs,
  | "editorOpen"
  | "canManageApps"
  | "busy"
  | "editorMode"
  | "editorState"
  | "inheritedEditorAccent"
  | "setEditorState"
  | "iconQuery"
  | "setIconQuery"
  | "setDebouncedIconQuery"
  | "iconSelectionLocked"
  | "setIconSelectionLocked"
  | "dashboardIconsMetadata"
  | "dashboardIconsLoading"
  | "dashboardIconsError"
  | "filteredDashboardIcons"
  | "groups"
  | "themeMode"
  | "onCloseEditor"
  | "onSubmitEditor"
  | "onResetEditor"
  | "onDeleteEditor"
>): AppShellLayoutProps["appEditorProps"] {
  return {
    open: editorOpen && canManageApps,
    busy,
    editorMode,
    editorState,
    inheritedAccent: inheritedEditorAccent,
    setEditorState,
    iconQuery,
    setIconQuery,
    setDebouncedIconQuery,
    iconSelectionLocked,
    setIconSelectionLocked,
    dashboardIconsMetadata,
    dashboardIconsLoading,
    dashboardIconsError,
    filteredDashboardIcons,
    groups,
    themeMode,
    onClose: onCloseEditor,
    onSubmit: onSubmitEditor,
    onReset: onResetEditor,
    onDelete: onDeleteEditor,
  };
}

function buildConfirmModalProps({
  confirmState,
  onConfirmAction,
  onCancelConfirm,
}: Pick<BuildAppShellLayoutPropsArgs, "confirmState" | "onConfirmAction" | "onCancelConfirm">): AppShellLayoutProps["confirmModalProps"] {
  return {
    open: confirmState.open,
    message: confirmState.message,
    onConfirm: onConfirmAction,
    onCancel: onCancelConfirm,
  };
}

function buildShortcutHelpModalProps({
  shortcutHelpOpen,
  onCloseShortcutHelp,
}: Pick<BuildAppShellLayoutPropsArgs, "shortcutHelpOpen" | "onCloseShortcutHelp">): AppShellLayoutProps["shortcutHelpModalProps"] {
  return {
    open: shortcutHelpOpen,
    onClose: onCloseShortcutHelp,
  };
}

function buildSettingsModalProps({
  settingsOpen,
  busy,
  canManageApps,
  currentUserId,
  userName,
  userAuthProvider,
  groups,
  managedUsers,
  apps,
  settingsInitialTab,
  settingsInitialJsonMode,
  jsonImportMode,
  setJsonImportMode,
  jsonValue,
  setJsonValue,
  jsonModalError,
  jsonModalInfo,
  jsonFileInputRef,
  onCloseSettings,
  onCreateGroup,
  onRenameGroup,
  onMoveGroup,
  onReorderGroups,
  onDeleteGroup,
  onCreateInvitation,
  onCopyInvitationLink,
  onChangeRole,
  onDeleteUser,
  onJsonFileChange,
  onCopyExport,
  onImportJson,
  onPrepareExport,
  onResetImport,
  onLogout,
  preferences,
  themeMode,
  dashboardIconsMetadata,
  onUpdatePreferences,
  onUpdateUsername,
  onUpdatePassword,
  onDeleteSelf,
  onAccountSuccess,
  onAccountError,
  onPreviewTheme,
  oidcConfig,
  onSaveOidcConfig,
  onResetOidcConfig,
}: Pick<
  BuildAppShellLayoutPropsArgs,
  | "settingsOpen"
  | "busy"
  | "canManageApps"
  | "currentUserId"
  | "userName"
  | "userAuthProvider"
  | "groups"
  | "managedUsers"
  | "apps"
  | "settingsInitialTab"
  | "settingsInitialJsonMode"
  | "jsonImportMode"
  | "setJsonImportMode"
  | "jsonValue"
  | "setJsonValue"
  | "jsonModalError"
  | "jsonModalInfo"
  | "jsonFileInputRef"
  | "onCloseSettings"
  | "onCreateGroup"
  | "onRenameGroup"
  | "onMoveGroup"
  | "onReorderGroups"
  | "onDeleteGroup"
  | "onCreateInvitation"
  | "onCopyInvitationLink"
  | "onChangeRole"
  | "onDeleteUser"
  | "onJsonFileChange"
  | "onCopyExport"
  | "onImportJson"
  | "onPrepareExport"
  | "onResetImport"
  | "onLogout"
  | "preferences"
  | "themeMode"
  | "dashboardIconsMetadata"
  | "onUpdatePreferences"
  | "onUpdateUsername"
  | "onUpdatePassword"
  | "onDeleteSelf"
  | "onAccountSuccess"
  | "onAccountError"
  | "onPreviewTheme"
  | "oidcConfig"
  | "onSaveOidcConfig"
  | "onResetOidcConfig"
>): AppShellLayoutProps["settingsModalProps"] {
  return {
    open: settingsOpen,
    busy,
    canManageApps,
    currentUserId,
    userName,
    authProvider: userAuthProvider,
    groups,
    users: managedUsers,
    apps,
    initialTab: settingsInitialTab,
    initialJsonMode: settingsInitialJsonMode,
    jsonImportMode,
    setJsonImportMode,
    jsonValue,
    setJsonValue,
    jsonModalError,
    jsonModalInfo,
    jsonFileInputRef,
    onClose: onCloseSettings,
    onCreateGroup,
    onRenameGroup,
    onMoveGroup,
    onReorderGroups,
    onDeleteGroup,
    onCreateInvitation,
    onCopyInvitationLink,
    onChangeRole,
    onDeleteUser,
    onJsonFileChange,
    onCopyExport,
    onImport: onImportJson,
    onPrepareExport,
    onResetImport,
    onLogout,
    preferences,
    themeMode,
    dashboardIconsMetadata,
    onUpdatePreferences,
    onUpdateUsername,
    onUpdatePassword,
    onDeleteSelf,
    onAccountSuccess,
    onAccountError,
    onPreviewTheme,
    oidcConfig,
    onSaveOidcConfig,
    onResetOidcConfig,
  };
}

function buildToastContainerProps({
  toasts,
  onDismissToast,
}: Pick<BuildAppShellLayoutPropsArgs, "toasts" | "onDismissToast">): AppShellLayoutProps["toastContainerProps"] {
  return {
    toasts,
    onDismiss: onDismissToast,
  };
}

function buildDragOverlayTileProps({
  draggedApp,
  sidebarMode,
  themeMode,
  dashboardIconsMetadata,
  dragOutProgress,
  appStatuses,
}: Pick<
  BuildAppShellLayoutPropsArgs,
  "draggedApp" | "sidebarMode" | "themeMode" | "dashboardIconsMetadata" | "dragOutProgress" | "appStatuses"
>): AppShellLayoutProps["dragOverlayTileProps"] {
  return {
    app: draggedApp,
    compact: sidebarMode === "compact",
    themeMode,
    dashboardIconsMetadata,
    dragOutProgress,
    appStatus: draggedApp ? appStatuses[draggedApp.id] : undefined,
  };
}
