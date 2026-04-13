import type { BuildAppShellLayoutPropsArgs } from "../build-app-shell-layout-props";

type ShellFrameArgs = Pick<
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
type SidebarWorkspaceArgs = Pick<
  BuildAppShellLayoutPropsArgs,
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
>;
type EditorArgs = Pick<
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
type ModalAndSettingsStateArgs = Pick<
  BuildAppShellLayoutPropsArgs,
  | "confirmState"
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
  | "oidcConfig"
>;

export type AuthenticatedShellLayoutSegments = {
  shellFrameArgs: ShellFrameArgs;
  sidebarWorkspaceArgs: SidebarWorkspaceArgs;
  editorArgs: EditorArgs;
  modalAndSettingsStateArgs: ModalAndSettingsStateArgs;
};

export function buildAuthenticatedShellLayoutSegments({
  shellFrameArgs,
  sidebarWorkspaceArgs,
  editorArgs,
  modalAndSettingsStateArgs,
}: AuthenticatedShellLayoutSegments): AuthenticatedShellLayoutSegments {
  return {
    shellFrameArgs,
    sidebarWorkspaceArgs,
    editorArgs,
    modalAndSettingsStateArgs,
  };
}
