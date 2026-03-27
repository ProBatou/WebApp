import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppIcon } from "./AppIcon";
import type { AppStatusEntry, ContextMenuState, DashboardIconsMetadataMap, GroupEntry, SidebarMode, ThemeMode, WebAppEntry } from "../types";

const collapsedGroupsStorageKey = "webapp-v2-collapsed-groups";

function readCollapsedGroups() {
  const rawValue = window.localStorage.getItem(collapsedGroupsStorageKey);
  if (!rawValue) {
    return new Set<string>();
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(
      parsedValue.filter((value): value is string => typeof value === "string" && value.startsWith("group:"))
    );
  } catch {
    return new Set<string>();
  }
}

function GroupDropZone({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={isOver ? "group-drop-zone active" : "group-drop-zone"}>
      {children}
    </div>
  );
}

function SortableAppTile({
  app,
  active,
  compact,
  onSelect,
  onEdit,
  onContextMenu,
  themeMode,
  dashboardIconsMetadata,
  appStatus,
}: {
  app: WebAppEntry;
  active: boolean;
  compact: boolean;
  onSelect: (app: WebAppEntry) => void;
  onEdit: (app: WebAppEntry) => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>, app: WebAppEntry) => void;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  appStatus?: AppStatusEntry;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const constrainedTransform = transform ? { ...transform, x: 0 } : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(constrainedTransform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={isDragging ? (active ? "app-tile active dragging" : "app-tile dragging") : active ? "app-tile active" : "app-tile"}
      onContextMenu={(event) => {
        event.stopPropagation();
        onContextMenu(event, app);
      }}
      onMouseDown={(event) => {
        if (event.button === 2) {
          event.preventDefault();
        }
      }}
    >
      <button
        className="app-main-hitbox"
        type="button"
        onClick={() => onSelect(app)}
        title={app.name}
        aria-label={`Ouvrir ${app.name}`}
        {...attributes}
        {...listeners}
      >
        <AppIcon
          icon={app.icon}
          name={app.name}
          url={app.url}
          accent={app.accent}
          themeMode={themeMode}
          dashboardIconsMetadata={dashboardIconsMetadata}
          iconVariantMode={app.icon_variant_mode}
          iconVariantInverted={app.icon_variant_inverted}
        />
        {!compact ? (
          <span className="app-meta">
            <strong>
              {app.name}
              {app.is_default ? <span className="default-app-badge" title="App par defaut">★</span> : null}
              <span
                className={appStatus?.status === "online"
                  ? "app-status-dot online"
                  : appStatus?.status === "offline"
                    ? "app-status-dot offline"
                    : "app-status-dot unknown"}
                aria-label={
                  appStatus?.status === "online"
                    ? "Application en ligne"
                    : appStatus?.status === "offline"
                      ? "Application hors ligne"
                      : "Statut inconnu"
                }
                title={
                  appStatus?.status === "online"
                    ? "En ligne"
                    : appStatus?.status === "offline"
                      ? "Hors ligne"
                      : "Statut inconnu"
                }
              />
            </strong>
            <small>{app.open_mode === "iframe" ? "Integree" : "Externe"}</small>
          </span>
        ) : null}
      </button>
      {!compact ? (
        <div className="app-tile-actions">
          <button className="ghost-icon-button" type="button" onClick={() => onEdit(app)} aria-label={`Modifier ${app.name}`}>
            Edit
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DragOverlayTile({
  app,
  compact,
  themeMode,
  dashboardIconsMetadata,
  dragOutProgress,
}: {
  app: WebAppEntry;
  compact: boolean;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  dragOutProgress: number;
}) {
  const fadeProgress = dragOutProgress <= 0.72 ? 0 : (dragOutProgress - 0.72) / 0.28;
  const overlayOpacity = Math.max(0.4, 1 - fadeProgress * 0.6);
  const overlayScale = 1 - fadeProgress * 0.08;
  const overlayBlur = fadeProgress * 5;

  return (
    <div
      className={compact ? "drag-overlay-tile compact" : "drag-overlay-tile"}
      style={{
        opacity: overlayOpacity,
        transform: `scale(${overlayScale})`,
        filter: `blur(${overlayBlur}px)`,
      }}
    >
      <AppIcon
        icon={app.icon}
        name={app.name}
        url={app.url}
        accent={app.accent}
        themeMode={themeMode}
        dashboardIconsMetadata={dashboardIconsMetadata}
        iconVariantMode={app.icon_variant_mode}
        iconVariantInverted={app.icon_variant_inverted}
      />
      {!compact ? (
        <span className="app-meta">
          <strong>{app.name}</strong>
          <small>{app.open_mode === "iframe" ? "Integree" : "Externe"}</small>
        </span>
      ) : null}
    </div>
  );
}

export function Sidebar({
  sidebarRef,
  sidebarOpen,
  setSidebarOpen,
  sidebarMode,
  setSidebarMode,
  userName,
  groups,
  apps,
  selectedAppId,
  draggingAppId,
  dragOutProgress,
  themeMode,
  dashboardIconsMetadata,
  busy,
  contextMenu,
  appStatuses,
  onOpenSidebarContextMenu,
  onOpenCreateEditor,
  onOpenJsonImport,
  onOpenGroupManager,
  onLogout,
  onToggleTheme,
  onSelectApp,
  onEditApp,
  onOpenContextMenu,
}: {
  sidebarRef: RefObject<HTMLElement | null>;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  sidebarMode: SidebarMode;
  setSidebarMode: Dispatch<SetStateAction<SidebarMode>>;
  userName: string;
  groups: GroupEntry[];
  apps: WebAppEntry[];
  selectedAppId: number | null;
  draggingAppId: number | null;
  dragOutProgress: number;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  busy: boolean;
  contextMenu: ContextMenuState;
  appStatuses: Record<number, AppStatusEntry>;
  onOpenSidebarContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onOpenCreateEditor: () => void;
  onOpenJsonImport: () => void;
  onOpenGroupManager: () => void;
  onLogout: () => Promise<void>;
  onToggleTheme: () => void;
  onSelectApp: (app: WebAppEntry) => void;
  onEditApp: (app: WebAppEntry) => void;
  onOpenContextMenu: (event: MouseEvent<HTMLDivElement>, app: WebAppEntry) => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => readCollapsedGroups());
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedFilterQuery = filterQuery.trim().toLowerCase();
  const filteredApps = useMemo(() => {
    if (draggingAppId !== null || !normalizedFilterQuery) {
      return apps;
    }

    return apps.filter((app) => app.name.toLowerCase().includes(normalizedFilterQuery));
  }, [apps, draggingAppId, normalizedFilterQuery]);
  const groupedSections = useMemo(() => {
    const groupedApps = groups
      .map((group) => ({
        id: `group:${group.id}`,
        label: group.name,
        apps: filteredApps.filter((app) => app.group_id === group.id),
      }))
      .filter((section) => section.apps.length > 0);

    const ungroupedApps = filteredApps.filter((app) => app.group_id === null);
    if (ungroupedApps.length > 0) {
      groupedApps.push({
        id: "group:none",
        label: "Sans groupe",
        apps: ungroupedApps,
      });
    }

    return groupedApps;
  }, [filteredApps, groups]);
  const visibleAppsInCompact = useMemo(() => {
    return filteredApps.filter((app) => {
      const sectionId = app.group_id === null ? "group:none" : `group:${app.group_id}`;
      return !collapsedGroups.has(sectionId);
    });
  }, [collapsedGroups, filteredApps]);

  useEffect(() => {
    if (!actionsMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!actionsMenuRef.current?.contains(target)) {
        setActionsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [actionsMenuOpen]);

  useEffect(() => {
    setActionsMenuOpen(false);
  }, [sidebarMode]);

  useEffect(() => {
    window.localStorage.setItem(collapsedGroupsStorageKey, JSON.stringify(Array.from(collapsedGroups)));
  }, [collapsedGroups]);

  const toggleGroupVisibility = (groupId: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <>
      <button
        className="edge-trigger"
        type="button"
        aria-label="Afficher la barre laterale"
        onMouseEnter={() => setSidebarOpen(true)}
        onFocus={() => setSidebarOpen(true)}
        onClick={() => setSidebarOpen(true)}
      />

      {sidebarOpen ? <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}

      <aside
        ref={sidebarRef}
        className={sidebarOpen ? `sidebar drawer-open ${sidebarMode}` : `sidebar ${sidebarMode}`}
        onContextMenu={onOpenSidebarContextMenu}
        onMouseLeave={() => {
          if (draggingAppId !== null) {
            return;
          }

          window.setTimeout(() => {
            if (!document.querySelector(".sidebar-context-menu") && !contextMenu) {
              setSidebarOpen(false);
            }
          }, 0);
        }}
      >
        <div className="brand-block">
          {sidebarMode === "expanded" ? (
            <div className="brand-copy">
              <p className="eyebrow">Connecte en tant que</p>
              <h1>{userName}</h1>
            </div>
          ) : (
            <div className="compact-header-stack">
              <button
                className="ghost-icon-button burger-button"
                type="button"
                onClick={() => setSidebarMode((current) => (current === "expanded" ? "compact" : "expanded"))}
                aria-label="Passer en mode etendu"
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          )}
          {sidebarMode === "expanded" ? (
            <div className="sidebar-header-actions">
              <button
                className="ghost-icon-button burger-button"
                type="button"
                onClick={() => setSidebarMode((current) => (current === "expanded" ? "compact" : "expanded"))}
                aria-label={sidebarMode === "expanded" ? "Passer en mode icones" : "Passer en mode etendu"}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          ) : null}
        </div>

        <div className="sidebar-section">
          {sidebarMode === "expanded" ? <p className="section-title">Applications</p> : null}
          {sidebarMode === "expanded" ? (
            <label className="sidebar-search">
              <span className="sr-only">Rechercher une application</span>
              <input
                type="search"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder={draggingAppId !== null ? "Recherche indisponible pendant le tri" : "Rechercher une app"}
                disabled={draggingAppId !== null}
              />
            </label>
          ) : null}
          <SortableContext
            items={(sidebarMode === "compact" ? visibleAppsInCompact : filteredApps).map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {sidebarMode === "expanded" ? (
              <div className="app-section-list">
                {groupedSections.map((section) => (
                  <section key={section.id} className="grouped-app-section">
                    <button
                      className="group-section-toggle"
                      type="button"
                      onClick={() => toggleGroupVisibility(section.id)}
                      aria-expanded={!collapsedGroups.has(section.id)}
                      aria-label={`${collapsedGroups.has(section.id) ? "Afficher" : "Masquer"} le groupe ${section.label}`}
                    >
                      <span className="group-section-title">{section.label}</span>
                      <span className={collapsedGroups.has(section.id) ? "group-chevron collapsed" : "group-chevron"} aria-hidden="true">▾</span>
                    </button>
                    {!collapsedGroups.has(section.id) ? (
                      <GroupDropZone id={section.id}>
                        <SortableContext items={section.apps.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                          <div className="app-list grouped-app-list">
                            {section.apps.map((app) => (
                              <SortableAppTile
                                key={app.id}
                                app={app}
                                active={app.id === selectedAppId}
                                compact={false}
                                onSelect={onSelectApp}
                                onEdit={onEditApp}
                                onContextMenu={onOpenContextMenu}
                                themeMode={themeMode}
                                dashboardIconsMetadata={dashboardIconsMetadata}
                                appStatus={appStatuses[app.id]}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </GroupDropZone>
                    ) : null}
                  </section>
                ))}
                {filteredApps.length === 0 ? <p className="sidebar-empty-state">Aucune application ne correspond a la recherche.</p> : null}
              </div>
            ) : (
              <div className="app-list">
                {visibleAppsInCompact.map((app) => (
                  <SortableAppTile
                    key={app.id}
                    app={app}
                    active={app.id === selectedAppId}
                    compact
                    onSelect={onSelectApp}
                    onEdit={onEditApp}
                    onContextMenu={onOpenContextMenu}
                    themeMode={themeMode}
                    dashboardIconsMetadata={dashboardIconsMetadata}
                    appStatus={appStatuses[app.id]}
                  />
                ))}
                {visibleAppsInCompact.length === 0 ? <p className="sidebar-empty-state">Aucune application visible.</p> : null}
              </div>
            )}
          </SortableContext>
        </div>

        {draggingAppId !== null ? (
          <div className={dragOutProgress > 0 ? "sidebar-trash-hint active" : "sidebar-trash-hint"}>Sortir a droite pour supprimer</div>
        ) : null}

        <div className="sidebar-bottom-actions">
          <button className="primary-button" type="button" onClick={onOpenCreateEditor} title="Nouvelle app">
            {sidebarMode === "expanded" ? "Nouvelle" : "+"}
          </button>
          <div ref={actionsMenuRef} className={actionsMenuOpen ? "sidebar-actions-menu open" : "sidebar-actions-menu"}>
            <button
              className="secondary-button sidebar-actions-trigger"
              type="button"
              onClick={() => setActionsMenuOpen((current) => !current)}
              title="Actions"
              aria-haspopup="menu"
              aria-expanded={actionsMenuOpen}
            >
              {sidebarMode === "expanded" ? "Actions" : "⋯"}
            </button>
            {actionsMenuOpen ? (
              <div className="sidebar-actions-popover" role="menu" aria-label="Actions de la barre laterale">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    onOpenJsonImport();
                  }}
                  title="Importer JSON"
                >
                  JSON
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    onOpenGroupManager();
                  }}
                  title="Gerer les groupes"
                >
                  Groupes
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    void onLogout();
                  }}
                  disabled={busy}
                  title="Deconnexion"
                >
                  Quitter
                </button>
              </div>
            ) : null}
          </div>
          <button className="ghost-icon-button theme-toggle" type="button" onClick={onToggleTheme} aria-label="Basculer le theme" title="Dark mode">
            {themeMode === "light" ? "◐" : "◑"}
          </button>
        </div>
      </aside>
    </>
  );
}
