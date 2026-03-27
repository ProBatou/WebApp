import { useEffect, useRef } from "react";
import { useTranslation } from "../lib/i18n";
import type { ContextMenuState, SidebarMode } from "../types";

export function ContextMenu({
  contextMenu,
  sidebarMode,
  canManageApps,
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
  canManageApps: boolean;
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
  const { t } = useTranslation();
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
              {t("app.refresh")}
            </button>
          ) : null}
          {canManageApps ? (
            <>
              <button type="button" className="sidebar-context-item" role="menuitem" onClick={onEdit}>
                {t("common.edit")}
              </button>
              <button type="button" className="sidebar-context-item" role="menuitem" onClick={onToggleDefault}>
                {contextMenu.app.is_default ? t("app.removeDefault") : t("app.setDefault")}
              </button>
              <button type="button" className="sidebar-context-item" role="menuitem" onClick={onDelete}>
                {t("common.delete")}
              </button>
            </>
          ) : null}
        </>
      ) : null}
      {!contextMenu.app && canManageApps ? (
        <>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onCreate}>
            {t("app.new")}
          </button>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onImport}>
            {t("app.importJson")}
          </button>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onExport}>
            {t("app.exportJson")}
          </button>
          <button type="button" className="sidebar-context-item" role="menuitem" onClick={onToggleSidebarMode}>
            {sidebarMode === "expanded" ? t("app.switchCompact") : t("app.switchExpanded")}
          </button>
        </>
      ) : null}
    </div>
  );
}
