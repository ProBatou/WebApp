import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { AuthScreen } from "./components/AuthScreen";
import { AppEditor } from "./components/AppEditor";
import { ConfirmModal } from "./components/ConfirmModal";
import { ContextMenu } from "./components/ContextMenu";
import { SettingsModal, type SettingsTab } from "./components/SettingsModal";
import { ShortcutHelpModal } from "./components/ShortcutHelpModal";
import { DragOverlayTile, Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { Workspace } from "./components/Workspace";
import { getSuggestedDashboardIcon, themeStorageKey } from "./lib/app-utils";
import { apiFetch } from "./lib/api";
import { useApps } from "./hooks/useApps";
import { useAppStatus } from "./hooks/useAppStatus";
import { useAuth } from "./hooks/useAuth";
import { useDashboardIcons } from "./hooks/useDashboardIcons";
import { useEditor } from "./hooks/useEditor";
import { useGroups } from "./hooks/useGroups";
import { useAppShellUi } from "./hooks/useAppShellUi";
import { useIframes } from "./hooks/useIframes";
import { useJsonImport } from "./hooks/useJsonImport";
import { useModals } from "./hooks/useModals";
import { usePreferences } from "./hooks/usePreferences";
import { useSettingsActions } from "./hooks/useSettingsActions";
import { useToast } from "./hooks/useToast";
import { useUserManagement } from "./hooks/useUserManagement";
import { I18nProvider, useI18nContext, useTranslation } from "./lib/i18n";
import type {
  SidebarMode,
  ThemeMode,
  WebAppEntry,
} from "./types";

function AppContent() {
  const { t } = useTranslation();
  const { lang, setLang } = useI18nContext();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("expanded");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setContextMenu(null);
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

  const normalizedIconQuery = debouncedIconQuery.trim().toLowerCase();
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
    setContextMenu(null);
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
    handleToggleDefaultApp,
    handleUpdatePreferences,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleMoveGroup,
    handleReorderGroups,
  } = useSettingsActions({
    apps,
    groups,
    selectedAppId,
    pushToast,
    setApps,
    setBusy,
    setError,
    setContextMenu: () => setContextMenu(null),
    selectApp,
    createGroup,
    updateGroup,
    reorderGroups,
    deleteGroup,
    reloadApps,
    updatePreferences,
    t,
  });

  const {
    managedUsers,
    reloadUsers,
    handleUpdateUsername,
    handleUpdatePassword,
    handleDeleteSelf,
    handleCreateInvitation,
    handleChangeUserRole,
    handleDeleteUser,
    handleCopyInvitationLink,
  } = useUserManagement({
    pushToast,
    setBusy,
    setError,
    setUser,
    clearAppState,
    clearUiState,
    t,
  });

  const { appStatuses } = useAppStatus({
    apps,
    enabled: Boolean(user),
  });
  const canManageApps = user?.role === "admin";
  const inheritedEditorAccent = themeMode === "dark"
    ? (preferences.accentColorDark ?? "#df7a42")
    : (preferences.accentColor ?? "#c65c31");

  const {
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
  } = useJsonImport({
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
    setContextMenu: (value) => setContextMenuRef.current(value),
    setError,
  });
  closeJsonModalRef.current = closeJsonModal;

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

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!sidebarOpen) {
      setContextMenu(null);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void reloadGroups();
  }, [reloadGroups, user]);

  useEffect(() => {
    if (!user || !error) {
      return;
    }

    pushErrorToast(error);
    setError(null);
  }, [error, pushErrorToast, user]);

  useEffect(() => {
    if (!editorOpen || iconSelectionLocked || !normalizedIconQuery) {
      return;
    }

    const nextIcon = getSuggestedDashboardIcon(normalizedIconQuery, dashboardIconsState.dashboardIcons);
    if (!nextIcon || nextIcon === editorState.icon) {
      return;
    }

    setEditorState((current) => ({ ...current, icon: nextIcon }));
    setIconQuery(nextIcon);
  }, [dashboardIconsState.dashboardIcons, editorOpen, editorState.icon, iconSelectionLocked, normalizedIconQuery, setEditorState]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((current) => {
      const next = current === "light" ? "dark" : "light";
      updatePreferences({ theme: next });
      return next;
    });
  }, [updatePreferences]);

  const handleCloseConfirm = useCallback(() => {
    closeConfirm();
  }, [closeConfirm]);

  const handleConfirmAction = useCallback(() => {
    confirmState.onConfirm?.();
  }, [confirmState]);

  if (loading) {
    return <div className="full-screen-state">{t("app.loadingWebapp")}</div>;
  }

  if (error && !user) {
    return <div className="full-screen-state error-state">{t(error)}</div>;
  }

  if (!user) {
    return (
      <AuthScreen
        needsSetup={needsSetup}
        demoMode={demoMode}
        themeMode={themeMode}
        busy={busy}
        authError={authError}
        credentials={credentials}
        inviteToken={inviteToken}
        inviteRole={inviteRole}
        setCredentials={setCredentials}
        onSubmit={handleAuthSubmit}
        onToggleTheme={toggleThemeMode}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragCancel={handleDragCancel}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <div className="app-shell" onClick={handleCloseContextMenu} aria-busy={busy}>
        <div className={busy ? "busy-indicator visible" : "busy-indicator"} role="status" aria-live="polite">
          <span className="busy-spinner" aria-hidden="true" />
          <span>{t("app.busy")}</span>
        </div>

        <Sidebar
          sidebarRef={sidebarRef}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          userName={user.username}
          canManageApps={canManageApps}
          groups={groups}
          apps={apps}
          selectedAppId={selectedAppId}
          draggingAppId={draggingAppId}
          dragOutProgress={dragOutProgress}
          reorderAppsEnabled={reorderAppsEnabled}
          themeMode={themeMode}
          dashboardIconsMetadata={dashboardIconsState.dashboardIconsMetadata}
          busy={busy}
          contextMenu={contextMenu}
          appStatuses={appStatuses}
          onOpenSidebarContextMenu={openSidebarContextMenu}
          onOpenCreateEditor={openCreateEditorFromUi}
          onOpenSettings={handleOpenSettings}
          onToggleReorderApps={handleToggleReorderApps}
          onToggleTheme={toggleThemeMode}
          lang={lang}
          setLang={setLang}
          onSelectApp={handleSelectApp}
          onEditApp={openEditEditorFromUi}
          onOpenContextMenu={openContextMenu}
          onReorderGroups={handleReorderGroups}
        />

        <Workspace
          selectedApp={selectedApp}
          mountedIframeApps={mountedIframeApps}
          iframeReloadTokens={iframeReloadTokens}
        />

        <ContextMenu
          contextMenu={contextMenu}
          sidebarMode={sidebarMode}
          canManageApps={canManageApps}
          onClose={handleCloseContextMenu}
          onRefresh={handleRefreshContextApp}
          onEdit={handleEditContextApp}
          onDelete={handleDeleteContextApp}
          onToggleDefault={handleToggleDefaultContextApp}
          onCreate={openCreateEditorFromUi}
          onImport={() => handleOpenSettings("json", "import")}
          onExport={() => handleOpenSettings("json", "export")}
          onToggleSidebarMode={handleToggleSidebarMode}
        />

        <AppEditor
          open={editorOpen && canManageApps}
          busy={busy}
          editorMode={editorMode}
          editorState={editorState}
          inheritedAccent={inheritedEditorAccent}
          setEditorState={setEditorState}
          iconQuery={iconQuery}
          setIconQuery={setIconQuery}
          setDebouncedIconQuery={setDebouncedIconQuery}
          iconSelectionLocked={iconSelectionLocked}
          setIconSelectionLocked={setIconSelectionLocked}
          dashboardIconsMetadata={dashboardIconsState.dashboardIconsMetadata}
          dashboardIconsLoading={dashboardIconsState.dashboardIconsLoading}
          dashboardIconsError={dashboardIconsState.dashboardIconsError}
          filteredDashboardIcons={dashboardIconsState.filteredDashboardIcons}
          groups={groups}
          themeMode={themeMode}
          onClose={closeEditor}
          onSubmit={handleSaveApp}
          onReset={openCreateEditorFromUi}
          onDelete={handleDeleteApp}
        />

<ConfirmModal
          open={confirmState.open}
          message={confirmState.message}
          onConfirm={handleConfirmAction}
          onCancel={handleCloseConfirm}
        />

        <ShortcutHelpModal open={shortcutHelpOpen} onClose={closeShortcutHelp} />
        <SettingsModal
          open={settingsOpen}
          busy={busy}
          canManageApps={canManageApps}
          currentUserId={user.id}
          userName={user.username}
          groups={groups}
          users={managedUsers}
          apps={apps}
          initialTab={settingsInitialTab}
          initialJsonMode={settingsInitialJsonMode}
          jsonImportMode={jsonImportMode}
          setJsonImportMode={setJsonImportMode}
          jsonValue={jsonValue}
          setJsonValue={setJsonValue}
          jsonModalError={jsonModalError}
          jsonModalInfo={jsonModalInfo}
          jsonFileInputRef={jsonFileInputRef}
          onClose={() => {
            closeSettings();
            clearPreviewTheme();
          }}
          onCreateGroup={handleCreateGroup}
          onRenameGroup={handleRenameGroup}
          onMoveGroup={handleMoveGroup}
          onReorderGroups={handleReorderGroups}
          onDeleteGroup={handleDeleteGroup}
          onCreateInvitation={handleCreateInvitation}
          onCopyInvitationLink={handleCopyInvitationLink}
          onChangeRole={handleChangeUserRole}
          onDeleteUser={handleDeleteUser}
          onJsonFileChange={handleJsonFileChange}
          onCopyExport={handleCopyExportJson}
          onImport={handleImportJson}
          onPrepareExport={prepareExport}
          onResetImport={resetImport}
          onLogout={handleLogout}
          preferences={preferences}
          themeMode={themeMode}
          onUpdatePreferences={handleUpdatePreferences}
          onUpdateUsername={handleUpdateUsername}
          onUpdatePassword={handleUpdatePassword}
          onDeleteSelf={handleDeleteSelf}
          onAccountSuccess={pushToast}
          onAccountError={pushErrorToast}
          onPreviewTheme={previewTheme}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>

      <DragOverlay zIndex={2000} dropAnimation={null}>
        {draggedApp ? (
          <DragOverlayTile
            app={draggedApp}
            compact={sidebarMode === "compact"}
            themeMode={themeMode}
            dashboardIconsMetadata={dashboardIconsState.dashboardIconsMetadata}
            dragOutProgress={dragOutProgress}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
