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
import type { AppEditorState, AppEmbedCheckResponse, AuthPendingState, ContextMenuState, GroupEntry, SettingsTab, SidebarMode, WebAppEntry } from "../types";

const AUTH_TAB_CLOSE_POLL_MS = 250;
const AUTH_RECHECK_TIMEOUT_MS = 10 * 60 * 1000;
const AUTH_SILENT_PROMPT_DELAY_MS = 1400;
const AUTH_REDIRECT_SETTLE_DELAY_MS = 250;
const AUTH_OVERLAY_CLEAR_DELAY_MS = 150;

function openNewTab(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
}

type UseAppShellUiOptions = {
  userPresent: boolean;
  userRole: "admin" | "viewer" | null;
  canManageApps: boolean;
  editorOpen: boolean;
  shortcutHelpOpen: boolean;
  settingsOpen: boolean;
  apps: WebAppEntry[];
  groups: GroupEntry[];
  mountedIframeApps: WebAppEntry[];
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
  unmountIframeApp: (appId: number) => void;
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
  mountedIframeApps,
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
  unmountIframeApp,
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
  const [authPending, setAuthPending] = useState<AuthPendingState | null>(null);
  const authRedirectCleanupRef = useRef<(() => void) | null>(null);

  const cancelAuthRedirectFlow = useCallback(() => {
    authRedirectCleanupRef.current?.();
    authRedirectCleanupRef.current = null;
    setAuthPending((current) => {
      if (current && !current.keepMountedFrame) {
        unmountIframeApp(current.appId);
      }

      return null;
    });
  }, [unmountIframeApp]);

  const startAuthPromptFlow = useCallback((app: WebAppEntry, keepMountedFrame: boolean) => {
    cancelAuthRedirectFlow();
    setAuthPending({ appId: app.id, phase: "checking", keepMountedFrame });

    let promptDelayId: number | null = window.setTimeout(() => {
      promptDelayId = null;
      setAuthPending((current) => {
        if (current?.appId !== app.id) {
          return current;
        }

        return { ...current, phase: "prompt" };
      });
    }, AUTH_SILENT_PROMPT_DELAY_MS);

    const cancel = () => {
      if (promptDelayId !== null) {
        window.clearTimeout(promptDelayId);
        promptDelayId = null;
      }
      if (authRedirectCleanupRef.current === cancel) {
        authRedirectCleanupRef.current = null;
      }
    };

    authRedirectCleanupRef.current = cancel;
  }, [cancelAuthRedirectFlow]);

  useEffect(() => () => {
    authRedirectCleanupRef.current?.();
    authRedirectCleanupRef.current = null;
  }, []);

  const armAuthRedirectWatcher = useCallback((app: WebAppEntry, authTab: Window | null, keepMountedFrame: boolean) => {
    cancelAuthRedirectFlow();
    setAuthPending({ appId: app.id, phase: "login", keepMountedFrame });

    let sawPageHidden = document.visibilityState === "hidden";
    let completed = false;
    let intervalId: number | null = null;
    let timeoutId: number | null = null;
    let settleDelayId: number | null = null;
    let overlayClearId: number | null = null;

    const stopWatching = () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const cancel = () => {
      stopWatching();
      if (settleDelayId !== null) {
        window.clearTimeout(settleDelayId);
        settleDelayId = null;
      }
      if (overlayClearId !== null) {
        window.clearTimeout(overlayClearId);
        overlayClearId = null;
      }
      if (authRedirectCleanupRef.current === cancel) {
        authRedirectCleanupRef.current = null;
      }
    };

    const complete = () => {
      if (completed) {
        return;
      }

      completed = true;
      stopWatching();
      setAuthPending({ appId: app.id, phase: "settling", keepMountedFrame });

      settleDelayId = window.setTimeout(() => {
        refreshIframeApp(app);
        selectApp(app.id);

        overlayClearId = window.setTimeout(() => {
          if (authRedirectCleanupRef.current === cancel) {
            authRedirectCleanupRef.current = null;
          }
          setAuthPending((current) => (current?.appId === app.id ? null : current));
        }, AUTH_OVERLAY_CLEAR_DELAY_MS);
      }, AUTH_REDIRECT_SETTLE_DELAY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sawPageHidden = true;
      }

      if (document.visibilityState === "visible" && sawPageHidden) {
        complete();
      }
    };

    intervalId = authTab
      ? window.setInterval(() => {
          if (authTab.closed) {
            complete();
          }
        }, AUTH_TAB_CLOSE_POLL_MS)
      : null;
    timeoutId = window.setTimeout(() => {
      cancel();
      setAuthPending((current) => {
        if (current?.appId !== app.id) {
          return current;
        }

        if (!current.keepMountedFrame) {
          unmountIframeApp(current.appId);
        }

        return null;
      });
    }, AUTH_RECHECK_TIMEOUT_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    authRedirectCleanupRef.current = cancel;
  }, [cancelAuthRedirectFlow, refreshIframeApp, selectApp, unmountIframeApp]);

  const handleOpenAuthPending = useCallback(() => {
    if (!authPending) {
      return;
    }

    const app = apps.find((item) => item.id === authPending.appId);
    if (!app || app.open_mode !== "iframe") {
      cancelAuthRedirectFlow();
      return;
    }

    const tab = window.open(app.url, "_blank", "noopener,noreferrer");
    armAuthRedirectWatcher(app, tab, authPending.keepMountedFrame);
  }, [apps, armAuthRedirectWatcher, authPending, cancelAuthRedirectFlow]);

  const handleDismissAuthPending = useCallback(() => {
    cancelAuthRedirectFlow();
  }, [cancelAuthRedirectFlow]);

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

    if (app.open_mode === "iframe" && mountedIframeApps.some((mountedApp) => mountedApp.id === app.id)) {
      cancelAuthRedirectFlow();
      selectApp(app.id);
      return;
    }

    if (authPending?.appId === app.id) {
      selectApp(app.id);
      return;
    }

    cancelAuthRedirectFlow();

    if (app.open_mode === "external") {
      openNewTab(app.url);
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
            selectApp(app.id);
            startAuthPromptFlow(app, true);
          } else {
            // Permanently blocked (X-Frame-Options / CSP) — open externally.
            const launchUrl = embedCheck.externalUrl ?? app.url;
            openNewTab(launchUrl);
          }
          return;
        }
      } catch {
        // Fallback to standard iframe behavior when embed inspection fails.
        cancelAuthRedirectFlow();
      }

      selectApp(app.id);
    })();
  }, [authPending, cancelAuthRedirectFlow, mountedIframeApps, selectApp, setSidebarOpen, startAuthPromptFlow]);

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
    authPending,
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
    handleOpenAuthPending,
    handleDismissAuthPending,
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
