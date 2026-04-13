import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import type { DragCancelEvent, DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { apiFetch } from "../lib/api";
import {
  SIDEBAR_DELETE_THRESHOLD_SELECTOR,
  getDraggedPointerLeft,
  getEventClientX,
  getSidebarDeleteThresholdLeft,
  getSidebarDeleteZoneProgress,
  isPastSidebarDeleteThreshold,
} from "../lib/sidebar-delete-zone";
import type { AppEditorState, AppEmbedCheckResponse, ContextMenuState, GroupEntry, SettingsTab, SidebarMode, WebAppEntry } from "../types";

type UseAppShellUiOptions = {
  userPresent: boolean;
  userRole: "admin" | "viewer" | null;
  canManageApps: boolean;
  editorOpen: boolean;
  shortcutHelpOpen: boolean;
  settingsOpen: boolean;
  apps: WebAppEntry[];
  groups: GroupEntry[];
  sidebarRef: RefObject<HTMLElement | null>;
  closeEditor: () => void;
  closeSettings: () => void;
  closeShortcutHelp: () => void;
  closeJsonModal: () => void;
  closeAuxiliaryModals: () => void;
  openShortcutHelp: () => void;
  openSettings: () => void;
  openCreateEditor: () => void;
  openEditEditor: (app: WebAppEntry) => void;
  prepareExport: () => void;
  resetImport: () => void;
  reloadUsers: () => Promise<void>;
  refreshIframeApp: (app: WebAppEntry) => void;
  selectApp: (appId: number | null) => void;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setSidebarMode: Dispatch<SetStateAction<SidebarMode>>;
  setEditorState: Dispatch<SetStateAction<AppEditorState>>;
  inheritedEditorAccent: string;
  handleDeleteAppFromUi: (appId: number) => Promise<void>;
  handleToggleDefaultApp: (app: WebAppEntry) => Promise<void>;
  handleReorder: (event: DragEndEvent, isDroppedOutsideSidebar: (event: DragEndEvent) => boolean, groups: GroupEntry[]) => Promise<void>;
};

export function useAppShellUi({
  userPresent,
  userRole,
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
  handleDeleteAppFromUi,
  handleToggleDefaultApp,
  handleReorder,
}: UseAppShellUiOptions) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [draggingAppId, setDraggingAppId] = useState<number | null>(null);
  const [dragOutProgress, setDragOutProgress] = useState(0);
  const [reorderAppsEnabled, setReorderAppsEnabled] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab | undefined>(undefined);
  const [settingsInitialJsonMode, setSettingsInitialJsonMode] = useState<"import" | "export" | undefined>(undefined);
  const dragPointerStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editorOpen && !shortcutHelpOpen && !settingsOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editorOpen) {
          closeEditor();
        }

        if (shortcutHelpOpen) {
          closeShortcutHelp();
        }

        if (settingsOpen) {
          closeSettings();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeEditor, closeSettings, closeShortcutHelp, editorOpen, settingsOpen, shortcutHelpOpen]);

  const openCreateEditorFromUi = useCallback(() => {
    if (!canManageApps) {
      return;
    }

    setContextMenu(null);
    closeJsonModal();
    closeAuxiliaryModals();
    openCreateEditor();
    setEditorState((current) => ({ ...current, accent: inheritedEditorAccent }));
  }, [canManageApps, closeAuxiliaryModals, closeJsonModal, inheritedEditorAccent, openCreateEditor, setEditorState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (event.key === "Escape") {
        setContextMenu(null);
        setReorderAppsEnabled(false);
        return;
      }

      if (!userPresent || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget) {
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
        closeSettings();
        openShortcutHelp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canManageApps, closeEditor, closeJsonModal, closeSettings, openCreateEditorFromUi, openShortcutHelp, userPresent]);

  const handleSelectApp = useCallback((app: WebAppEntry) => {
    setContextMenu(null);
    setSidebarOpen(false);

    if (app.open_mode === "external") {
      const tab = window.open(app.url, "_blank", "noopener,noreferrer");
      if (!tab) {
        window.location.assign(app.url);
      }
      selectApp(app.id);
      return;
    }

    void (async () => {
      try {
        const embedCheck = await apiFetch<AppEmbedCheckResponse>(`/api/apps/${app.id}/embed-check`, {
          method: "GET",
        });

        if (!embedCheck.embeddable && embedCheck.openExternally) {
          if (embedCheck.reason === "auth_redirect") {
            // Open the app in a new tab so the user can authenticate.
            // We keep a reference (no noopener) to poll for tab close, then
            // retry embed-check and load in iframe if auth resolved it.
            const tab = window.open(app.url, "_blank");
            if (!tab) {
              window.location.assign(app.url);
              return;
            }
            const startTime = Date.now();
            const MAX_POLL_MS = 10 * 60 * 1000; // stop polling after 10 min
            const timer = window.setInterval(() => {
              const timedOut = Date.now() - startTime > MAX_POLL_MS;
              if (tab.closed || timedOut) {
                window.clearInterval(timer);
                if (!tab.closed) return; // timed out, user still has tab open
                void (async () => {
                  try {
                    const recheck = await apiFetch<AppEmbedCheckResponse>(
                      `/api/apps/${app.id}/embed-check`,
                      { method: "GET" },
                    );
                    if (recheck.embeddable) {
                      selectApp(app.id);
                    }
                  } catch {
                    // ignore — user can click the app again manually
                  }
                })();
              }
            }, 500);
          } else {
            // Permanently blocked (X-Frame-Options / CSP) — open externally.
            const launchUrl = embedCheck.externalUrl ?? app.url;
            const tab = window.open(launchUrl, "_blank", "noopener,noreferrer");
            if (!tab) {
              window.location.assign(launchUrl);
            }
          }
          return;
        }
      } catch {
        // Fallback to standard iframe behavior when embed inspection fails.
      }

      selectApp(app.id);
    })();
  }, [selectApp, setSidebarOpen]);

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

  const getDeleteThresholdLeft = useCallback(() => {
    const sidebarBounds = sidebarRef.current?.getBoundingClientRect();
    if (!sidebarBounds) {
      return null;
    }

    const thresholdMarker = sidebarRef.current?.querySelector<HTMLElement>(SIDEBAR_DELETE_THRESHOLD_SELECTOR);
    return getSidebarDeleteThresholdLeft({
      sidebarRight: sidebarBounds.right,
      markerLeft: thresholdMarker?.getBoundingClientRect().left ?? null,
    });
  }, [sidebarRef]);

  const getCurrentDragLeft = useCallback((deltaX: number, fallbackLeft?: number | null) => {
    return getDraggedPointerLeft({
      initialPointerLeft: dragPointerStartXRef.current,
      deltaX,
    }) ?? fallbackLeft ?? null;
  }, []);

  const getDragOutProgress = useCallback((deltaX: number, fallbackLeft?: number | null) => {
    const thresholdLeft = getDeleteThresholdLeft();
    const currentLeft = getCurrentDragLeft(deltaX, fallbackLeft);
    if (thresholdLeft === null || currentLeft === null) {
      return 0;
    }

    return getSidebarDeleteZoneProgress({
      currentLeft,
      thresholdLeft,
    });
  }, [getCurrentDragLeft, getDeleteThresholdLeft]);

  const isDroppedOutsideSidebar = useCallback((event: DragEndEvent) => {
    const translated = event.active.rect.current.translated;
    const thresholdLeft = getDeleteThresholdLeft();
    const currentLeft = getCurrentDragLeft(event.delta.x, translated?.left);
    if (thresholdLeft === null || currentLeft === null) {
      return false;
    }

    return isPastSidebarDeleteThreshold({
      currentLeft,
      thresholdLeft,
    });
  }, [getCurrentDragLeft, getDeleteThresholdLeft]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const nextId = Number(event.active.id);
    dragPointerStartXRef.current = getEventClientX(event.activatorEvent);
    setDraggingAppId(Number.isNaN(nextId) ? null : nextId);
    setDragOutProgress(0);
    setContextMenu(null);
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const translated = event.active.rect.current.translated;
    const currentLeft = getCurrentDragLeft(event.delta.x, translated?.left);
    if (currentLeft === null) {
      setDragOutProgress(0);
      return;
    }

    setDragOutProgress(getDragOutProgress(event.delta.x, translated?.left));
  }, [getCurrentDragLeft, getDragOutProgress]);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    dragPointerStartXRef.current = null;
    setDraggingAppId(null);
    setDragOutProgress(0);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingAppId(null);
    setDragOutProgress(0);
    try {
      await handleReorder(event, isDroppedOutsideSidebar, groups);
    } finally {
      dragPointerStartXRef.current = null;
    }
  }, [groups, handleReorder, isDroppedOutsideSidebar]);

  const handleOpenSettings = useCallback((tab?: SettingsTab, jsonMode?: "import" | "export") => {
    setContextMenu(null);
    closeEditor();
    closeShortcutHelp();
    setSettingsInitialTab(tab);
    setSettingsInitialJsonMode(jsonMode);
    if (jsonMode === "export") {
      prepareExport();
    } else if (jsonMode === "import") {
      resetImport();
    }
    openSettings();
    if (userRole === "admin") {
      void reloadUsers();
    }
  }, [closeEditor, closeShortcutHelp, openSettings, prepareExport, reloadUsers, resetImport, userRole]);

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
  }, [setSidebarMode]);

  const handleToggleReorderApps = useCallback(() => {
    setContextMenu(null);
    setReorderAppsEnabled((current) => !current);
  }, []);

  const draggedApp = draggingAppId === null ? null : apps.find((item) => item.id === draggingAppId) ?? null;

  return {
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
  };
}
