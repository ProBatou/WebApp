import type { BuildAppShellLayoutPropsArgs } from "../lib/build-app-shell-layout-props";
import type { SettingsTab } from "../components/SettingsModal";

type BuildAuthenticatedShellHandlersArgs = {
  openCreateEditorFromUi: () => void;
  handleOpenSettings: (tab?: SettingsTab, jsonMode?: "import" | "export") => void;
  openSidebarContextMenu: BuildAppShellLayoutPropsArgs["onOpenSidebarContextMenu"];
  handleToggleReorderApps: () => void;
  toggleThemeMode: () => void;
  handleSelectApp: BuildAppShellLayoutPropsArgs["onSelectApp"];
  openEditEditorFromUi: BuildAppShellLayoutPropsArgs["onEditApp"];
  openContextMenu: BuildAppShellLayoutPropsArgs["onOpenContextMenu"];
  handleReorderGroups: BuildAppShellLayoutPropsArgs["onReorderGroups"];
  handleCloseContextMenu: () => void;
  handleRefreshContextApp: BuildAppShellLayoutPropsArgs["onRefreshContextApp"];
  handleEditContextApp: BuildAppShellLayoutPropsArgs["onEditContextApp"];
  handleDeleteContextApp: BuildAppShellLayoutPropsArgs["onDeleteContextApp"];
  handleToggleDefaultContextApp: BuildAppShellLayoutPropsArgs["onToggleDefaultContextApp"];
  handleToggleSidebarMode: BuildAppShellLayoutPropsArgs["onToggleSidebarMode"];
  closeEditor: BuildAppShellLayoutPropsArgs["onCloseEditor"];
  handleSaveApp: BuildAppShellLayoutPropsArgs["onSubmitEditor"];
  handleDeleteApp: BuildAppShellLayoutPropsArgs["onDeleteEditor"];
  handleConfirmAction: () => void;
  handleCloseConfirm: () => void;
  closeShortcutHelp: () => void;
  closeSettings: () => void;
  clearPreviewTheme: () => void;
  handleCreateGroup: BuildAppShellLayoutPropsArgs["onCreateGroup"];
  handleRenameGroup: BuildAppShellLayoutPropsArgs["onRenameGroup"];
  handleMoveGroup: BuildAppShellLayoutPropsArgs["onMoveGroup"];
  handleDeleteGroup: BuildAppShellLayoutPropsArgs["onDeleteGroup"];
  handleCreateInvitation: BuildAppShellLayoutPropsArgs["onCreateInvitation"];
  handleCopyInvitationLink: BuildAppShellLayoutPropsArgs["onCopyInvitationLink"];
  handleChangeUserRole: BuildAppShellLayoutPropsArgs["onChangeRole"];
  handleDeleteUser: BuildAppShellLayoutPropsArgs["onDeleteUser"];
  handleJsonFileChange: BuildAppShellLayoutPropsArgs["onJsonFileChange"];
  handleCopyExportJson: BuildAppShellLayoutPropsArgs["onCopyExport"];
  handleImportJson: BuildAppShellLayoutPropsArgs["onImportJson"];
  prepareExport: BuildAppShellLayoutPropsArgs["onPrepareExport"];
  resetImport: BuildAppShellLayoutPropsArgs["onResetImport"];
  handleLogout: BuildAppShellLayoutPropsArgs["onLogout"];
  handleUpdatePreferences: BuildAppShellLayoutPropsArgs["onUpdatePreferences"];
  handleUpdateUsername: BuildAppShellLayoutPropsArgs["onUpdateUsername"];
  handleUpdatePassword: BuildAppShellLayoutPropsArgs["onUpdatePassword"];
  handleDeleteSelf: BuildAppShellLayoutPropsArgs["onDeleteSelf"];
  pushToast: BuildAppShellLayoutPropsArgs["onAccountSuccess"];
  pushErrorToast: BuildAppShellLayoutPropsArgs["onAccountError"];
  previewTheme: BuildAppShellLayoutPropsArgs["onPreviewTheme"];
  dismissToast: BuildAppShellLayoutPropsArgs["onDismissToast"];
  handleSaveOidcConfig: BuildAppShellLayoutPropsArgs["onSaveOidcConfig"];
  handleResetOidcConfig: BuildAppShellLayoutPropsArgs["onResetOidcConfig"];
};

export function buildAuthenticatedShellHandlers({
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
  handleSaveOidcConfig,
  handleResetOidcConfig,
}: BuildAuthenticatedShellHandlersArgs) {
  const primaryHandlers: Pick<
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
  > = {
    onOpenSidebarContextMenu: openSidebarContextMenu,
    onOpenCreateEditor: openCreateEditorFromUi,
    onOpenSettings: handleOpenSettings,
    onToggleReorderApps: handleToggleReorderApps,
    onToggleTheme: toggleThemeMode,
    onSelectApp: handleSelectApp,
    onEditApp: openEditEditorFromUi,
    onOpenContextMenu: openContextMenu,
    onReorderGroups: handleReorderGroups,
    onCloseContextMenu: handleCloseContextMenu,
    onRefreshContextApp: handleRefreshContextApp,
    onEditContextApp: handleEditContextApp,
    onDeleteContextApp: handleDeleteContextApp,
    onToggleDefaultContextApp: handleToggleDefaultContextApp,
    onToggleSidebarMode: handleToggleSidebarMode,
    onImportSettings: () => handleOpenSettings("json", "import"),
    onExportSettings: () => handleOpenSettings("json", "export"),
    onCloseEditor: closeEditor,
    onSubmitEditor: handleSaveApp,
    onResetEditor: openCreateEditorFromUi,
    onDeleteEditor: handleDeleteApp,
    onConfirmAction: handleConfirmAction,
    onCancelConfirm: handleCloseConfirm,
    onCloseShortcutHelp: closeShortcutHelp,
    onCloseSettings: () => {
      closeSettings();
      clearPreviewTheme();
    },
  };

  const settingsHandlers: Pick<
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
    | "onSaveOidcConfig"
    | "onResetOidcConfig"
  > = {
    onCreateGroup: handleCreateGroup,
    onRenameGroup: handleRenameGroup,
    onMoveGroup: handleMoveGroup,
    onDeleteGroup: handleDeleteGroup,
    onCreateInvitation: handleCreateInvitation,
    onCopyInvitationLink: handleCopyInvitationLink,
    onChangeRole: handleChangeUserRole,
    onDeleteUser: handleDeleteUser,
    onJsonFileChange: handleJsonFileChange,
    onCopyExport: handleCopyExportJson,
    onImportJson: handleImportJson,
    onPrepareExport: prepareExport,
    onResetImport: resetImport,
    onLogout: handleLogout,
    onUpdatePreferences: handleUpdatePreferences,
    onUpdateUsername: handleUpdateUsername,
    onUpdatePassword: handleUpdatePassword,
    onDeleteSelf: handleDeleteSelf,
    onAccountSuccess: pushToast,
    onAccountError: pushErrorToast,
    onPreviewTheme: previewTheme,
    onDismissToast: dismissToast,
    onSaveOidcConfig: handleSaveOidcConfig,
    onResetOidcConfig: handleResetOidcConfig,
  };

  return { primaryHandlers, settingsHandlers };
}
