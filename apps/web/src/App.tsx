import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AuthScreen } from "./components/AuthScreen";
import { AppEditor } from "./components/AppEditor";
import { ConfirmModal } from "./components/ConfirmModal";
import { ContextMenu } from "./components/ContextMenu";
import { GroupManagerModal } from "./components/GroupManagerModal";
import { JsonModal } from "./components/JsonModal";
import { ShortcutHelpModal } from "./components/ShortcutHelpModal";
import { DragOverlayTile, Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { UserManagerModal } from "./components/UserManagerModal";
import { Workspace } from "./components/Workspace";
import { getSuggestedDashboardIcon, themeStorageKey } from "./lib/app-utils";
import { apiFetch } from "./lib/api";
import { useApps } from "./hooks/useApps";
import { useAppStatus } from "./hooks/useAppStatus";
import { useAuth } from "./hooks/useAuth";
import { useDashboardIcons } from "./hooks/useDashboardIcons";
import { useEditor } from "./hooks/useEditor";
import { useGroups } from "./hooks/useGroups";
import { useIframes } from "./hooks/useIframes";
import { useJsonImport } from "./hooks/useJsonImport";
import { useModals } from "./hooks/useModals";
import { useToast } from "./hooks/useToast";
import { I18nProvider, useI18nContext, useTranslation } from "./lib/i18n";
import type {
  ContextMenuState,
  InvitationResponse,
  SidebarMode,
  ThemeMode,
  UserEntry,
  UsersResponse,
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
    return storedTheme === "dark" ? "dark" : "light";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managedUsers, setManagedUsers] = useState<UserEntry[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [draggingAppId, setDraggingAppId] = useState<number | null>(null);
  const [dragOutProgress, setDragOutProgress] = useState(0);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const closeJsonModalRef = useRef<() => void>(() => undefined);
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
    groupManagerOpen,
    userManagerOpen,
    shortcutHelpOpen,
    confirmState,
    openGroupManager,
    closeGroupManager,
    openUserManager,
    closeUserManager,
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

  const { appStatuses } = useAppStatus({
    apps,
    enabled: Boolean(user),
  });
  const canManageApps = user?.role === "admin";

  const {
    jsonModalMode,
    jsonImportMode,
    jsonValue,
    jsonModalError,
    jsonModalInfo,
    jsonFileInputRef,
    setJsonImportMode,
    setJsonValue,
    closeJsonModal,
    openJsonImport,
    openJsonExport,
    handleJsonFileChange,
    handleCopyExportJson,
    handleImportJson,
  } = useJsonImport({
    apps,
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
  closeJsonModalRef.current = closeJsonModal;

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

  useEffect(() => {
    if (!editorOpen && !jsonModalMode && !shortcutHelpOpen && !groupManagerOpen && !userManagerOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editorOpen) {
          closeEditor();
        }

        if (jsonModalMode) {
          closeJsonModal();
        }

        if (shortcutHelpOpen) {
          closeShortcutHelp();
        }

        if (groupManagerOpen) {
          closeGroupManager();
        }

        if (userManagerOpen) {
          closeUserManager();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeEditor, editorOpen, jsonModalMode, shortcutHelpOpen, groupManagerOpen, userManagerOpen, closeGroupManager, closeJsonModal, closeShortcutHelp, closeUserManager]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (event.key === "Escape") {
        setContextMenu(null);
        return;
      }

      if (!user || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget) {
        return;
      }

      if (canManageApps && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openCreateEditorFromUi();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setContextMenu(null);
        closeEditor();
        closeJsonModal();
        closeGroupManager();
        closeUserManager();
        openShortcutHelp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canManageApps, closeEditor, closeGroupManager, closeJsonModal, closeUserManager, openShortcutHelp, user]);

  const reloadUsers = useCallback(async () => {
    const result = await apiFetch<UsersResponse>("/api/users", { method: "GET" });
    setManagedUsers(result.items);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const handleSelectApp = useCallback((app: WebAppEntry) => {
    setContextMenu(null);
    setSidebarOpen(false);
    selectApp(app.id);

    if (app.open_mode === "external") {
      window.open(app.url, "_blank", "noopener,noreferrer");
    }
  }, [selectApp]);

  const handleDeleteAppFromUi = useCallback(async (appId: number) => {
    await deleteApp(appId);
    closeEditor();
    setContextMenu(null);
  }, [closeEditor, deleteApp]);

  const handleToggleDefaultApp = async (app: WebAppEntry) => {
    try {
      setBusy(true);
      setError(null);

      const result = await apiFetch<{ items: WebAppEntry[] }>(
        `/api/apps/${app.id}/default`,
        {
          method: app.is_default ? "DELETE" : "POST",
        }
      );

      setApps(result.items);

      if (!app.is_default) {
        selectApp(app.id);
      }

      pushToast(app.is_default ? "toast.defaultRemoved" : t("toast.defaultSet", { name: app.name }));
      setContextMenu(null);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "errors.update");
    } finally {
      setBusy(false);
    }
  };

  const openCreateEditorFromUi = useCallback(() => {
    if (!canManageApps) {
      return;
    }

    setContextMenu(null);
    closeJsonModal();
    closeAuxiliaryModals();
    openCreateEditor();
  }, [canManageApps, closeAuxiliaryModals, closeJsonModal, openCreateEditor]);

  const openEditEditorFromUi = useCallback((app: WebAppEntry) => {
    if (!canManageApps) {
      return;
    }

    setContextMenu(null);
    closeJsonModal();
    closeAuxiliaryModals();
    openEditEditor(app);
  }, [canManageApps, closeAuxiliaryModals, closeJsonModal, openEditEditor]);

  const openContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, app: WebAppEntry) => {
    if (!canManageApps && app.open_mode !== "iframe") {
      return;
    }

    event.preventDefault();
    closeAuxiliaryModals();

    const menuWidth = 190;
    const menuHeight = app.open_mode === "iframe" ? 212 : 172;
    const maxX = Math.max(12, window.innerWidth - menuWidth - 12);
    const maxY = Math.max(12, window.innerHeight - menuHeight - 12);

    setContextMenu({
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
      app,
    });
  }, [canManageApps, closeAuxiliaryModals]);

  const openSidebarContextMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!canManageApps) {
      return;
    }

    event.preventDefault();
    closeAuxiliaryModals();

    const menuWidth = 190;
    const menuHeight = 172;
    const maxX = Math.max(12, window.innerWidth - menuWidth - 12);
    const maxY = Math.max(12, window.innerHeight - menuHeight - 12);

    setContextMenu({
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
      app: null,
    });
  }, [canManageApps, closeAuxiliaryModals]);

  const getDragOutProgress = useCallback((translated: { left: number; right: number; width: number; height: number }) => {
    const sidebarBounds = sidebarRef.current?.getBoundingClientRect();
    if (!sidebarBounds) {
      return 0;
    }

    const fullExitDistance = translated.left - sidebarBounds.right;
    const visibleExitOffset = 24;
    if (fullExitDistance <= visibleExitOffset) {
      return 0;
    }

    return Math.min(1, (fullExitDistance - visibleExitOffset) / 180);
  }, []);

  const isDroppedOutsideSidebar = useCallback((event: DragEndEvent) => {
    const sidebarBounds = sidebarRef.current?.getBoundingClientRect();
    const translated = event.active.rect.current.translated;
    if (!sidebarBounds || !translated) {
      return false;
    }

    return translated.left > sidebarBounds.right + 72;
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const nextId = Number(event.active.id);
    setDraggingAppId(Number.isNaN(nextId) ? null : nextId);
    setDragOutProgress(0);
    setContextMenu(null);
    setSidebarOpen(true);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const translated = event.active.rect.current.translated;
    if (!translated) {
      setDragOutProgress(0);
      return;
    }

    setDragOutProgress(getDragOutProgress(translated));
  }, [getDragOutProgress]);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setDraggingAppId(null);
    setDragOutProgress(0);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingAppId(null);
    setDragOutProgress(0);
    await handleReorder(event, isDroppedOutsideSidebar, groups);
  }, [groups, handleReorder, isDroppedOutsideSidebar]);

  const handleOpenGroupManager = useCallback(() => {
    setContextMenu(null);
    closeEditor();
    closeJsonModal();
    closeUserManager();
    closeShortcutHelp();
    openGroupManager();
  }, [closeEditor, closeJsonModal, closeShortcutHelp, closeUserManager, openGroupManager]);

  const handleOpenUserManager = useCallback(() => {
    setContextMenu(null);
    closeEditor();
    closeJsonModal();
    closeGroupManager();
    closeShortcutHelp();
    openUserManager();
    if (user?.role === "admin") {
      void reloadUsers();
    }
  }, [closeEditor, closeGroupManager, closeJsonModal, closeShortcutHelp, openUserManager, reloadUsers, user?.role]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleRefreshContextApp = useCallback(() => {
    if (contextMenu?.app) {
      setContextMenu(null);
      refreshIframeApp(contextMenu.app);
    }
  }, [contextMenu, refreshIframeApp]);

  const handleEditContextApp = useCallback(() => {
    if (contextMenu?.app) {
      openEditEditorFromUi(contextMenu.app);
    }
  }, [contextMenu, openEditEditorFromUi]);

  const handleDeleteContextApp = useCallback(() => {
    if (contextMenu?.app) {
      void handleDeleteAppFromUi(contextMenu.app.id);
    }
  }, [contextMenu, handleDeleteAppFromUi]);

  const handleToggleDefaultContextApp = useCallback(() => {
    if (contextMenu?.app) {
      void handleToggleDefaultApp(contextMenu.app);
    }
  }, [contextMenu, handleToggleDefaultApp]);

  const handleToggleSidebarMode = useCallback(() => {
    setContextMenu(null);
    setSidebarMode((current) => (current === "expanded" ? "compact" : "expanded"));
  }, []);

  const handleCloseConfirm = useCallback(() => {
    closeConfirm();
  }, [closeConfirm]);

  const handleConfirmAction = useCallback(() => {
    confirmState.onConfirm?.();
  }, [confirmState]);

  const handleCreateGroup = useCallback(async (name: string) => {
    const group = await createGroup(name);
    pushToast(t("toast.groupAdded", { name: group.name }));
  }, [createGroup, pushToast, t]);

  const handleRenameGroup = useCallback(async (groupId: number, name: string) => {
    const group = await updateGroup(groupId, name);
    pushToast(t("toast.groupRenamed", { name: group.name }));
  }, [pushToast, t, updateGroup]);

  const handleDeleteGroup = useCallback(async (groupId: number) => {
    const group = groups.find((item) => item.id === groupId);
    await deleteGroup(groupId);
    await reloadApps(selectedAppId);
    pushToast(group ? t("toast.groupDeleted", { name: group.name }) : "toast.groupDeletedFallback");
  }, [deleteGroup, groups, pushToast, reloadApps, selectedAppId, t]);

  const handleMoveGroup = useCallback(async (groupId: number, direction: "up" | "down") => {
    const currentIndex = groups.findIndex((group) => group.id === groupId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) {
      return;
    }

    const nextGroups = [...groups];
    const [movedGroup] = nextGroups.splice(currentIndex, 1);
    nextGroups.splice(targetIndex, 0, movedGroup);
    await reorderGroups(nextGroups.map((group) => group.id));
  }, [groups, reorderGroups]);

  const handleReorderGroups = useCallback(async (groupIds: number[]) => {
    await reorderGroups(groupIds);
  }, [reorderGroups]);

  const handleCreateInvitation = useCallback(async (role: "admin" | "viewer") => {
    try {
      setBusy(true);
      setError(null);
      const result = await apiFetch<InvitationResponse>("/api/invitations", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      pushToast("toast.inviteLinkCreated");
      return result.inviteUrl;
    } finally {
      setBusy(false);
    }
  }, [pushToast]);

  const handleChangeUserRole = useCallback(async (userId: number, role: "admin" | "viewer") => {
    try {
      setBusy(true);
      setError(null);
      const result = await apiFetch<UsersResponse>(`/api/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      setManagedUsers(result.items);
      pushToast("toast.userRoleUpdated");
    } finally {
      setBusy(false);
    }
  }, [pushToast]);

  const handleDeleteUser = useCallback(async (userId: number) => {
    const managedUser = managedUsers.find((item) => item.id === userId);
    try {
      setBusy(true);
      setError(null);
      const result = await apiFetch<UsersResponse>(`/api/users/${userId}`, {
        method: "DELETE",
      });
      setManagedUsers(result.items);
      pushToast(managedUser ? t("toast.userDeleted", { name: managedUser.username }) : "toast.userDeletedFallback");
    } finally {
      setBusy(false);
    }
  }, [managedUsers, pushToast, t]);

  const handleCopyInvitationLink = useCallback(async (inviteLink: string) => {
    await navigator.clipboard.writeText(inviteLink);
    pushToast("toast.inviteLinkCopied");
  }, [pushToast]);

  const draggedApp = draggingAppId === null ? null : apps.find((item) => item.id === draggingAppId) ?? null;

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
          userRole={user.role}
          canManageApps={canManageApps}
          groups={groups}
          apps={apps}
          selectedAppId={selectedAppId}
          draggingAppId={draggingAppId}
          dragOutProgress={dragOutProgress}
          themeMode={themeMode}
          dashboardIconsMetadata={dashboardIconsState.dashboardIconsMetadata}
          busy={busy}
          contextMenu={contextMenu}
          appStatuses={appStatuses}
          onOpenSidebarContextMenu={openSidebarContextMenu}
          onOpenCreateEditor={openCreateEditorFromUi}
          onOpenJsonImport={openJsonImport}
          onOpenGroupManager={handleOpenGroupManager}
          onOpenUserManager={handleOpenUserManager}
          onLogout={handleLogout}
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
          onImport={openJsonImport}
          onExport={openJsonExport}
          onToggleSidebarMode={handleToggleSidebarMode}
        />

        <AppEditor
          open={editorOpen && canManageApps}
          busy={busy}
          editorMode={editorMode}
          editorState={editorState}
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

        <JsonModal
          open={jsonModalMode !== null}
          mode={jsonModalMode}
          apps={apps}
          busy={busy}
          jsonImportMode={jsonImportMode}
          setJsonImportMode={setJsonImportMode}
          jsonValue={jsonValue}
          setJsonValue={setJsonValue}
          jsonModalError={jsonModalError}
          jsonModalInfo={jsonModalInfo}
          jsonFileInputRef={jsonFileInputRef}
          onClose={closeJsonModal}
          onFileChange={handleJsonFileChange}
          onOpenExport={openJsonExport}
          onCopyExport={handleCopyExportJson}
          onImport={handleImportJson}
        />

        <ConfirmModal
          open={confirmState.open}
          message={confirmState.message}
          onConfirm={handleConfirmAction}
          onCancel={handleCloseConfirm}
        />

        <ShortcutHelpModal open={shortcutHelpOpen} onClose={closeShortcutHelp} />
        <GroupManagerModal
          open={groupManagerOpen}
          busy={busy}
          groups={groups}
          onClose={closeGroupManager}
          onCreateGroup={handleCreateGroup}
          onRenameGroup={handleRenameGroup}
          onMoveGroup={handleMoveGroup}
          onReorderGroups={handleReorderGroups}
          onDeleteGroup={handleDeleteGroup}
        />
        <UserManagerModal
          open={userManagerOpen && user.role === "admin"}
          busy={busy}
          currentUserId={user.id}
          users={managedUsers}
          onClose={closeUserManager}
          onCreateInvitation={handleCreateInvitation}
          onCopyInvitationLink={handleCopyInvitationLink}
          onChangeRole={handleChangeUserRole}
          onDeleteUser={handleDeleteUser}
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
