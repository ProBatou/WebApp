import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import type { DragCancelEvent, DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import type { SettingsTab } from "../components/SettingsModal";
import type { AppEditorState, ContextMenuState, GroupEntry, SidebarMode, WebAppEntry } from "../types";

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
    selectApp(app.id);

    if (app.open_mode === "external") {
      window.open(app.url, "_blank", "noopener,noreferrer");
    }
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
  }, [sidebarRef]);

  const isDroppedOutsideSidebar = useCallback((event: DragEndEvent) => {
    const sidebarBounds = sidebarRef.current?.getBoundingClientRect();
    const translated = event.active.rect.current.translated;
    if (!sidebarBounds || !translated) {
      return false;
    }

    return translated.left > sidebarBounds.right + 72;
  }, [sidebarRef]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const nextId = Number(event.active.id);
    setDraggingAppId(Number.isNaN(nextId) ? null : nextId);
    setDragOutProgress(0);
    setContextMenu(null);
    setSidebarOpen(true);
  }, [setSidebarOpen]);

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
