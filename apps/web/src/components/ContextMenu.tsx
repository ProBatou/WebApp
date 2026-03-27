import type { ContextMenuState, SidebarMode } from "../types";

export function ContextMenu({
  contextMenu,
  sidebarMode,
  onClose,
  onRefresh,
  onEdit,
  onDelete,
  onCreate,
  onImport,
  onExport,
  onToggleSidebarMode,
}: {
  contextMenu: ContextMenuState;
  sidebarMode: SidebarMode;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
  onToggleSidebarMode: () => void;
}) {
  if (!contextMenu) {
    return null;
  }

  return (
    <div
      className="sidebar-context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(event) => event.stopPropagation()}
      role="menu"
      onMouseLeave={onClose}
    >
      {contextMenu.app ? (
        <>
          {contextMenu.app.open_mode === "iframe" ? (
            <button type="button" className="sidebar-context-item" onClick={onRefresh}>
              Rafraichir
            </button>
          ) : null}
          <button type="button" className="sidebar-context-item" onClick={onEdit}>
            Editer
          </button>
          <button type="button" className="sidebar-context-item" onClick={onDelete}>
            Supprimer
          </button>
        </>
      ) : null}
      <button type="button" className="sidebar-context-item" onClick={onCreate}>
        Nouvelle app
      </button>
      {!contextMenu.app ? (
        <>
          <button type="button" className="sidebar-context-item" onClick={onImport}>
            Importer JSON
          </button>
          <button type="button" className="sidebar-context-item" onClick={onExport}>
            Exporter JSON
          </button>
          <button type="button" className="sidebar-context-item" onClick={onToggleSidebarMode}>
            {sidebarMode === "expanded" ? "Passer en compact" : "Passer en etendu"}
          </button>
        </>
      ) : null}
    </div>
  );
}
