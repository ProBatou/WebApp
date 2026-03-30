import { type ComponentProps } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { AppEditor } from "./AppEditor";
import { ConfirmModal } from "./ConfirmModal";
import { ContextMenu } from "./ContextMenu";
import { SettingsModal } from "./SettingsModal";
import { ShortcutHelpModal } from "./ShortcutHelpModal";
import { DragOverlayTile, Sidebar } from "./Sidebar";
import { ToastContainer } from "./ToastContainer";
import { Workspace } from "./Workspace";

type DndContextProps = ComponentProps<typeof DndContext>;

export type AppShellLayoutProps = {
  sensors: DndContextProps["sensors"];
  onDragStart: DndContextProps["onDragStart"];
  onDragMove: DndContextProps["onDragMove"];
  onDragCancel: DndContextProps["onDragCancel"];
  onDragEnd: DndContextProps["onDragEnd"];
  busy: boolean;
  busyLabel: string;
  onShellClick: () => void;
  sidebarProps: ComponentProps<typeof Sidebar>;
  workspaceProps: ComponentProps<typeof Workspace>;
  contextMenuProps: ComponentProps<typeof ContextMenu>;
  appEditorProps: ComponentProps<typeof AppEditor>;
  confirmModalProps: ComponentProps<typeof ConfirmModal>;
  shortcutHelpModalProps: ComponentProps<typeof ShortcutHelpModal>;
  settingsModalProps: ComponentProps<typeof SettingsModal>;
  toastContainerProps: ComponentProps<typeof ToastContainer>;
  dragOverlayTileProps: Omit<ComponentProps<typeof DragOverlayTile>, "app"> & {
    app: ComponentProps<typeof DragOverlayTile>["app"] | null;
  };
};

export function AppShellLayout({
  sensors,
  onDragStart,
  onDragMove,
  onDragCancel,
  onDragEnd,
  busy,
  busyLabel,
  onShellClick,
  sidebarProps,
  workspaceProps,
  contextMenuProps,
  appEditorProps,
  confirmModalProps,
  shortcutHelpModalProps,
  settingsModalProps,
  toastContainerProps,
  dragOverlayTileProps,
}: AppShellLayoutProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      <div className="app-shell" onClick={onShellClick} aria-busy={busy}>
        <div className={busy ? "busy-indicator visible" : "busy-indicator"} role="status" aria-live="polite">
          <span className="busy-spinner" aria-hidden="true" />
          <span>{busyLabel}</span>
        </div>

        <Sidebar {...sidebarProps} />
        <Workspace {...workspaceProps} />
        <ContextMenu {...contextMenuProps} />
        <AppEditor {...appEditorProps} />
        <ConfirmModal {...confirmModalProps} />
        <ShortcutHelpModal {...shortcutHelpModalProps} />
        <SettingsModal {...settingsModalProps} />
        <ToastContainer {...toastContainerProps} />
      </div>

      <DragOverlay zIndex={2000} dropAnimation={null}>
        {dragOverlayTileProps.app ? (
          <DragOverlayTile {...dragOverlayTileProps} app={dragOverlayTileProps.app} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
