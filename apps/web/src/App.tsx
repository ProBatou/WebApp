import { useCallback, useEffect, useRef, useState, startTransition, type ChangeEvent, type MouseEvent } from "react";
import { DndContext, DragOverlay, closestCenter, type DragCancelEvent, type DragEndEvent, type DragMoveEvent, type DragStartEvent } from "@dnd-kit/core";
import { AuthScreen } from "./components/AuthScreen";
import { AppEditor } from "./components/AppEditor";
import { ConfirmModal } from "./components/ConfirmModal";
import { ContextMenu } from "./components/ContextMenu";
import { JsonModal } from "./components/JsonModal";
import { DragOverlayTile, Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { parseImportedApps, exportAppsToJson, getSuggestedDashboardIcon, themeStorageKey } from "./lib/app-utils";
import { apiFetch } from "./lib/api";
import { useApps } from "./hooks/useApps";
import { useAuth } from "./hooks/useAuth";
import { useDashboardIcons } from "./hooks/useDashboardIcons";
import { useEditor } from "./hooks/useEditor";
import { useIframes } from "./hooks/useIframes";
import type { ContextMenuState, ImportAppsResponse, JsonImportMode, JsonModalMode, SidebarMode, ThemeMode, WebAppEntry } from "./types";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("expanded");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return storedTheme === "dark" ? "dark" : "light";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonModalMode, setJsonModalMode] = useState<JsonModalMode>(null);
  const [jsonImportMode, setJsonImportMode] = useState<JsonImportMode>("merge");
  const [jsonValue, setJsonValue] = useState("");
  const [jsonModalError, setJsonModalError] = useState<string | null>(null);
  const [jsonModalInfo, setJsonModalInfo] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [draggingAppId, setDraggingAppId] = useState<number | null>(null);
  const [dragOutProgress, setDragOutProgress] = useState(0);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    message: string;
    onConfirm: (() => void) | null;
  }>({ open: false, message: "", onConfirm: null });
  const sidebarRef = useRef<HTMLElement | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const closeJsonModal = useCallback(() => {
    setJsonModalMode(null);
    setJsonModalError(null);
    setJsonModalInfo(null);
  }, []);

  const {
    apps,
    setApps,
    selectedAppId,
    setSelectedAppId,
    reloadApps,
    deleteApp,
    handleReorder,
    resetAppsState,
  } = useApps({
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

  const clearAppState = useCallback(() => {
    resetAppsState();
    resetIframes();
  }, [resetAppsState, resetIframes]);

  const clearUiState = useCallback(() => {
    closeEditor();
    setContextMenu(null);
    closeJsonModal();
  }, [closeEditor, closeJsonModal]);

  const {
    user,
    needsSetup,
    loading,
    authError,
    credentials,
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
    if (!editorOpen && !jsonModalMode) {
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeEditor, editorOpen, jsonModalMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleThemeMode = () => {
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  };

  const handleSelectApp = (app: WebAppEntry) => {
    setContextMenu(null);
    setSidebarOpen(false);

    startTransition(() => {
      setSelectedAppId(app.id);
    });

    if (app.open_mode === "external") {
      window.open(app.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDeleteAppFromUi = async (appId: number) => {
    await deleteApp(appId);
    closeEditor();
    setContextMenu(null);
  };

  const openCreateEditorFromUi = () => {
    setContextMenu(null);
    closeJsonModal();
    openCreateEditor();
  };

  const openEditEditorFromUi = (app: WebAppEntry) => {
    setContextMenu(null);
    closeJsonModal();
    openEditEditor(app);
  };

  const openJsonImport = () => {
    setContextMenu(null);
    closeEditor();
    setJsonImportMode("merge");
    setJsonValue("");
    setJsonModalError(null);
    setJsonModalInfo(null);
    setJsonModalMode("import");
  };

  const openJsonExport = () => {
    setContextMenu(null);
    closeEditor();
    setJsonModalError(null);
    setJsonModalInfo(null);
    setJsonValue(exportAppsToJson(apps));
    setJsonModalMode("export");
  };

  const handleJsonFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const nextValue = await file.text();
      setJsonValue(nextValue);
      setJsonModalError(null);
      setJsonModalInfo(`${file.name} charge.`);
    } catch {
      setJsonModalError("Impossible de lire le fichier JSON.");
      setJsonModalInfo(null);
    } finally {
      event.target.value = "";
    }
  };

  const handleCopyExportJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonValue);
      setJsonModalError(null);
      setJsonModalInfo("JSON copie.");
    } catch {
      setJsonModalError("Impossible de copier le JSON.");
      setJsonModalInfo(null);
    }
  };

  const executeImport = async () => {
    try {
      setBusy(true);
      setError(null);
      setJsonModalError(null);
      setJsonModalInfo(null);

      const importedItems = parseImportedApps(jsonValue);
      const result = await apiFetch<ImportAppsResponse>("/api/apps/import", {
        method: "POST",
        body: JSON.stringify({
          mode: jsonImportMode,
          items: importedItems,
        }),
      });

      setApps(result.items);
      const preferredId = result.importedIds.length > 0 ? result.importedIds[result.importedIds.length - 1] : result.items[0]?.id ?? null;
      startTransition(() => {
        setSelectedAppId(preferredId);
      });
      closeJsonModal();
    } catch (importError) {
      setJsonModalError(importError instanceof Error ? importError.message : "Erreur d'import.");
    } finally {
      setBusy(false);
    }
  };

  const handleImportJson = async () => {
    try {
      const importedItems = parseImportedApps(jsonValue);
      if (jsonImportMode === "replace" && apps.length > 0) {
        setConfirmState({
          open: true,
          message: `Remplacer ${apps.length} application${apps.length > 1 ? "s" : ""} par ${importedItems.length} nouvelle${importedItems.length > 1 ? "s" : ""} entree${importedItems.length > 1 ? "s" : ""} ?`,
          onConfirm: () => {
            setConfirmState({ open: false, message: "", onConfirm: null });
            void executeImport();
          },
        });
        return;
      }

      await executeImport();
    } catch (importError) {
      setJsonModalError(importError instanceof Error ? importError.message : "Erreur d'import.");
    }
  };

  const openContextMenu = (event: MouseEvent<HTMLDivElement>, app: WebAppEntry) => {
    event.preventDefault();

    const menuWidth = 190;
    const menuHeight = app.open_mode === "iframe" ? 172 : 132;
    const maxX = Math.max(12, window.innerWidth - menuWidth - 12);
    const maxY = Math.max(12, window.innerHeight - menuHeight - 12);

    setContextMenu({
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
      app,
    });
  };

  const openSidebarContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();

    const menuWidth = 190;
    const menuHeight = 172;
    const maxX = Math.max(12, window.innerWidth - menuWidth - 12);
    const maxY = Math.max(12, window.innerHeight - menuHeight - 12);

    setContextMenu({
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
      app: null,
    });
  };

  const getDragOutProgress = (translated: { left: number; right: number; width: number; height: number }) => {
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
  };

  const isDroppedOutsideSidebar = (event: DragEndEvent) => {
    const sidebarBounds = sidebarRef.current?.getBoundingClientRect();
    const translated = event.active.rect.current.translated;
    if (!sidebarBounds || !translated) {
      return false;
    }

    return translated.left > sidebarBounds.right + 72;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const nextId = Number(event.active.id);
    setDraggingAppId(Number.isNaN(nextId) ? null : nextId);
    setDragOutProgress(0);
    setContextMenu(null);
    setSidebarOpen(true);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const translated = event.active.rect.current.translated;
    if (!translated) {
      setDragOutProgress(0);
      return;
    }

    setDragOutProgress(getDragOutProgress(translated));
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setDraggingAppId(null);
    setDragOutProgress(0);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingAppId(null);
    setDragOutProgress(0);
    await handleReorder(event, isDroppedOutsideSidebar);
  };

  const draggedApp = draggingAppId === null ? null : apps.find((item) => item.id === draggingAppId) ?? null;

  if (loading) {
    return <div className="full-screen-state">Chargement de WebApp V2...</div>;
  }

  if (error && !user) {
    return <div className="full-screen-state error-state">{error}</div>;
  }

  if (!user) {
    return (
      <AuthScreen
        needsSetup={needsSetup}
        themeMode={themeMode}
        busy={busy}
        authError={authError}
        credentials={credentials}
        setCredentials={setCredentials}
        onSubmit={handleAuthSubmit}
        onToggleTheme={toggleThemeMode}
      />
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragCancel={handleDragCancel}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <div className="app-shell" onClick={() => setContextMenu(null)}>
        <Sidebar
          sidebarRef={sidebarRef}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          userName={user.username}
          apps={apps}
          selectedAppId={selectedAppId}
          draggingAppId={draggingAppId}
          dragOutProgress={dragOutProgress}
          themeMode={themeMode}
          dashboardIconsMetadata={dashboardIconsState.dashboardIconsMetadata}
          busy={busy}
          contextMenu={contextMenu}
          onOpenSidebarContextMenu={openSidebarContextMenu}
          onOpenCreateEditor={openCreateEditorFromUi}
          onOpenJsonImport={openJsonImport}
          onLogout={handleLogout}
          onToggleTheme={toggleThemeMode}
          onSelectApp={handleSelectApp}
          onEditApp={openEditEditorFromUi}
          onOpenContextMenu={openContextMenu}
        />

        <Workspace
          error={error}
          selectedApp={selectedApp}
          mountedIframeApps={mountedIframeApps}
          iframeReloadTokens={iframeReloadTokens}
        />

        <ContextMenu
          contextMenu={contextMenu}
          sidebarMode={sidebarMode}
          onClose={() => setContextMenu(null)}
          onRefresh={() => {
            if (contextMenu?.app) {
              setContextMenu(null);
              refreshIframeApp(contextMenu.app);
            }
          }}
          onEdit={() => {
            if (contextMenu?.app) {
              openEditEditorFromUi(contextMenu.app);
            }
          }}
          onDelete={() => {
            if (contextMenu?.app) {
              void handleDeleteAppFromUi(contextMenu.app.id);
            }
          }}
          onCreate={openCreateEditorFromUi}
          onImport={openJsonImport}
          onExport={openJsonExport}
          onToggleSidebarMode={() => {
            setContextMenu(null);
            setSidebarMode((current) => (current === "expanded" ? "compact" : "expanded"));
          }}
        />

        <AppEditor
          open={editorOpen}
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
          onConfirm={() => confirmState.onConfirm?.()}
          onCancel={() => setConfirmState({ open: false, message: "", onConfirm: null })}
        />
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
