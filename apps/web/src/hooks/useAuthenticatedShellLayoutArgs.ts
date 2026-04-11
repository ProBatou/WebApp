import type { BuildAppShellLayoutPropsArgs } from "../lib/build-app-shell-layout-props";
import type { AppShellLayoutProps } from "../components/AppShellLayout";
import type { AuthUser } from "../types";

type UseAuthenticatedShellLayoutArgsParams = {
  user: AuthUser | null;
  canManageApps: boolean;
  shellFrameArgs: Pick<
    BuildAppShellLayoutPropsArgs,
    | "sensors"
    | "onDragStart"
    | "onDragMove"
    | "onDragCancel"
    | "onDragEnd"
    | "busy"
    | "busyLabel"
    | "onShellClick"
    | "sidebarRef"
    | "sidebarOpen"
    | "setSidebarOpen"
    | "sidebarMode"
    | "setSidebarMode"
  >;
  sidebarWorkspaceArgs: Omit<
    Pick<
      BuildAppShellLayoutPropsArgs,
      | "canManageApps"
      | "groups"
      | "apps"
      | "selectedAppId"
      | "selectedApp"
      | "mountedIframeApps"
      | "iframeReloadTokens"
      | "draggingAppId"
      | "dragOutProgress"
      | "reorderAppsEnabled"
      | "themeMode"
      | "lang"
      | "setLang"
      | "contextMenu"
      | "appStatuses"
      | "dashboardIconsMetadata"
      | "dashboardIconsLoading"
      | "dashboardIconsError"
    >,
    "canManageApps"
  >;
  editorArgs: Pick<
    BuildAppShellLayoutPropsArgs,
    | "filteredDashboardIcons"
    | "editorOpen"
    | "editorMode"
    | "editorState"
    | "inheritedEditorAccent"
    | "setEditorState"
    | "iconQuery"
    | "setIconQuery"
    | "setDebouncedIconQuery"
    | "iconSelectionLocked"
    | "setIconSelectionLocked"
  >;
  modalAndSettingsStateArgs: Pick<
    BuildAppShellLayoutPropsArgs,
    | "shortcutHelpOpen"
    | "settingsOpen"
    | "settingsInitialTab"
    | "settingsInitialJsonMode"
    | "managedUsers"
    | "jsonImportMode"
    | "setJsonImportMode"
    | "jsonValue"
    | "setJsonValue"
    | "jsonModalError"
    | "jsonModalInfo"
    | "jsonFileInputRef"
    | "preferences"
    | "toasts"
    | "draggedApp"
  > & {
    confirmState: Pick<BuildAppShellLayoutPropsArgs["confirmState"], "open" | "message">;
  };
  primaryHandlers: Pick<
    BuildAppShellLayoutPropsArgs,
    | "onOpenSidebarContextMenu"
    | "onOpenCreateEditor"
    | "onOpenSettings"
    | "onToggleReorderApps"
    | "onToggleTheme"
    | "onSelectApp"
    | "onEditApp"
    | "onOpenContextMenu"
    | "onReorderGroups"
    | "onCloseContextMenu"
    | "onRefreshContextApp"
    | "onEditContextApp"
    | "onDeleteContextApp"
    | "onToggleDefaultContextApp"
    | "onToggleSidebarMode"
    | "onImportSettings"
    | "onExportSettings"
    | "onCloseEditor"
    | "onSubmitEditor"
    | "onResetEditor"
    | "onDeleteEditor"
    | "onConfirmAction"
    | "onCancelConfirm"
    | "onCloseShortcutHelp"
    | "onCloseSettings"
  >;
  settingsHandlers: Pick<
    BuildAppShellLayoutPropsArgs,
    | "onCreateGroup"
    | "onRenameGroup"
    | "onMoveGroup"
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
    | "onUpdatePreferences"
    | "onUpdateUsername"
    | "onUpdatePassword"
    | "onDeleteSelf"
    | "onAccountSuccess"
    | "onAccountError"
    | "onPreviewTheme"
    | "onDismissToast"
  >;
};

export function useAuthenticatedShellLayoutArgs({
  user,
  canManageApps,
  shellFrameArgs,
  sidebarWorkspaceArgs,
  editorArgs,
  modalAndSettingsStateArgs,
  primaryHandlers,
  settingsHandlers,
}: UseAuthenticatedShellLayoutArgsParams): BuildAppShellLayoutPropsArgs | null {
  if (!user) {
    return null;
  }

  const confirmState: BuildAppShellLayoutPropsArgs["confirmState"] = {
    open: modalAndSettingsStateArgs.confirmState.open,
    message: modalAndSettingsStateArgs.confirmState.message,
  };

  return {
    ...shellFrameArgs,
    userName: user.username,
    userAuthProvider: user.authProvider,
    canManageApps,
    ...sidebarWorkspaceArgs,
    ...editorArgs,
    ...modalAndSettingsStateArgs,
    confirmState,
    currentUserId: user.id as AppShellLayoutProps["settingsModalProps"]["currentUserId"],
    ...primaryHandlers,
    ...settingsHandlers,
  };
}
