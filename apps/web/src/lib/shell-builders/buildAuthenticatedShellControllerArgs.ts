import type { AuthenticatedShellControllerArgs } from "../../hooks/useAuthenticatedShellController";

type BuildAuthenticatedShellControllerArgsInput = {
  core: Pick<
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
    | "mountedIframeApps"
  >;
  data: Pick<
    AuthenticatedShellControllerArgs,
    | "refreshIframeApp"
    | "unmountIframeApp"
    | "reloadUsers"
    | "reloadGroups"
    | "deleteApp"
    | "handleReorder"
  >;
  editor: Pick<
    AuthenticatedShellControllerArgs,
    | "editorOpen"
    | "editorState"
    | "setEditorState"
    | "iconQuery"
    | "setIconQuery"
    | "iconSelectionLocked"
    | "closeEditor"
    | "openCreateEditor"
    | "openEditEditor"
  >;
  modal: Pick<
    AuthenticatedShellControllerArgs,
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
  >;
  runtime: Pick<
    AuthenticatedShellControllerArgs,
    | "themeMode"
    | "setThemeMode"
    | "dashboardIconsState"
    | "pushErrorToast"
    | "inheritedEditorAccent"
    | "prepareExport"
    | "resetImport"
    | "handleToggleDefaultApp"
    | "updatePreferences"
    | "setError"
    | "selectApp"
  >;
};

export function buildAuthenticatedShellControllerArgs({
  core,
  data,
  editor,
  modal,
  runtime,
}: BuildAuthenticatedShellControllerArgsInput): AuthenticatedShellControllerArgs {
  return {
    ...core,
    ...data,
    ...editor,
    ...modal,
    ...runtime,
  };
}
