import { useEffect, useRef } from "react";
import type { ContextMenuState, SidebarMode } from "../types";

export function ContextMenu({
  contextMenu,
  sidebarMode,
  onClose,
  onRefresh,
  onEdit,
  onDelete,
  onToggleDefault,
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
  onToggleDefault: () => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
  onToggleSidebarMode: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>(".sidebar-context-item");
    firstItem?.focus();
  }, [contextMenu]);

  if (!contextMenu) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="sidebar-context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(event) => event.stopPropagation()}
      role="menu"
      aria-orientation="vertical"
      onMouseLeave={onClose}
      onKeyDown={(event) => {
        const menuItems = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(".sidebar-context-item") ?? []);
        const currentIndex = menuItems.findIndex((item) => item === document.activeElement);

        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }

        if (menuItems.length === 0) {
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
          menuItems[nextIndex]?.focus();
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          const nextIndex = currentIndex < 0 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length;
          menuItems[nextIndex]?.focus();
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          const activeItem = currentIndex < 0 ? null : menuItems[currentIndex];
          if (activeItem) {
            event.preventDefault();
            activeItem.click();
          }
        }
      }}
    >
      {contextMenu.app ? (
        <>
          {contextMenu.app.open_mode === "iframe" ? (
            <button type="button" className="sidebar-context-item" role="menuitem" onClick={onRefresh}>
              Rafraichir
            </button>
          ) : null}
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onEdit}>
            Editer
          </button>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onToggleDefault}>
            {contextMenu.app.is_default ? "Retirer des favoris" : "Definir par defaut"}
          </button>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onDelete}>
            Supprimer
          </button>
        </>
      ) : null}
      <button type="button" className="sidebar-context-item" role="menuitem" onClick={onCreate}>
        Nouvelle app
      </button>
      {!contextMenu.app ? (
        <>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onImport}>
            Importer JSON
          </button>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onExport}>
            Exporter JSON
          </button>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onToggleSidebarMode}>
            {sidebarMode === "expanded" ? "Passer en compact" : "Passer en etendu"}
          </button>
        </>
      ) : null}
    </div>
  );
}
