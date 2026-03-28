import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppIcon } from "./AppIcon";
import { useTranslation, type SupportedLanguage } from "../lib/i18n";
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
  onContextMenu,
  themeMode,
  dashboardIconsMetadata,
  appStatus,
  canManageApps,
}: {
  app: WebAppEntry;
  active: boolean;
  compact: boolean;
  onSelect: (app: WebAppEntry) => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>, app: WebAppEntry) => void;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  appStatus?: AppStatusEntry;
  canManageApps: boolean;
}) {
  const { t } = useTranslation();
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
        aria-label={t("app.openAppAria", { name: app.name })}
        {...(canManageApps ? attributes : {})}
        {...(canManageApps ? listeners : {})}
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
              {app.open_mode === "external" ? (
                <span className="app-external-icon" aria-hidden="true">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" focusable="false" aria-hidden="true">
                    <path
                      d="M2 1h5v5M7 1L1 7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              ) : null}
              {app.is_default ? <span className="default-app-badge" title={t("app.default")}>★</span> : null}
              <span
                className={appStatus?.status === "online"
                  ? "app-status-dot online"
                  : appStatus?.status === "offline"
                    ? "app-status-dot offline"
                    : "app-status-dot unknown"}
                aria-label={
                  appStatus?.status === "online"
                    ? t("status.appOnline")
                    : appStatus?.status === "offline"
                      ? t("status.appOffline")
                      : t("status.appUnknown")
                }
                title={
                  appStatus?.status === "online"
                    ? t("status.online")
                    : appStatus?.status === "offline"
                      ? t("status.offline")
                      : t("status.unknown")
                }
              />
            </strong>
          </span>
        ) : null}
      </button>
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
  const { t } = useTranslation();
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
          <small>{app.open_mode === "iframe" ? t("app.openMode.embedded") : t("app.openMode.external")}</small>
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
  userRole,
  canManageApps,
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
  onOpenUserManager,
  onLogout,
  onToggleTheme,
  lang,
  setLang,
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
  userRole: "admin" | "viewer";
  canManageApps: boolean;
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
  onOpenUserManager: () => void;
  onLogout: () => Promise<void>;
  onToggleTheme: () => void;
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  onSelectApp: (app: WebAppEntry) => void;
  onEditApp: (app: WebAppEntry) => void;
  onOpenContextMenu: (event: MouseEvent<HTMLDivElement>, app: WebAppEntry) => void;
}) {
  const { t } = useTranslation();
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
        label: t("app.noGroup"),
        apps: ungroupedApps,
      });
    }

    return groupedApps;
  }, [filteredApps, groups, t]);
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
        aria-label={t("app.showSidebar")}
        onMouseEnter={() => setSidebarOpen(true)}
        onFocus={() => setSidebarOpen(true)}
        onClick={() => setSidebarOpen(true)}
      />

      {sidebarOpen ? <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}

      <aside
        ref={sidebarRef}
        className={sidebarOpen ? `sidebar drawer-open ${sidebarMode}` : `sidebar ${sidebarMode}`}
        onContextMenu={onOpenSidebarContextMenu}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => {
          if (draggingAppId !== null) {
            return;
          }

          if (!document.querySelector(".sidebar-context-menu") && !contextMenu) {
            setSidebarOpen(false);
          }
        }}
      >
        <div className="brand-block">
          {sidebarMode === "expanded" ? (
            <div className="brand-copy">
              <p className="eyebrow">{t("auth.signedInAs")}</p>
              <h1>{userName}</h1>
            </div>
          ) : (
            <div className="compact-header-stack">
              <button
                className="ghost-icon-button burger-button"
                type="button"
                onClick={() => setSidebarMode((current) => (current === "expanded" ? "compact" : "expanded"))}
                aria-label={t("app.switchExpandedMode")}
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
                aria-label={sidebarMode === "expanded" ? t("app.switchIconMode") : t("app.switchExpandedMode")}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          ) : null}
        </div>

        <div className="sidebar-section">
          {sidebarMode === "expanded" ? <p className="section-title">{t("sidebar.apps")}</p> : null}
          {sidebarMode === "expanded" ? (
            <label className="sidebar-search">
              <span className="sr-only">{t("app.searchApps")}</span>
              <input
                type="search"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder={draggingAppId !== null ? t("app.searchUnavailableWhileSorting") : t("app.searchApps")}
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
                      aria-label={collapsedGroups.has(section.id) ? t("app.showGroup", { group: section.label }) : t("app.hideGroup", { group: section.label })}
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
                                onContextMenu={onOpenContextMenu}
                                themeMode={themeMode}
                              dashboardIconsMetadata={dashboardIconsMetadata}
                              appStatus={appStatuses[app.id]}
                              canManageApps={canManageApps}
                            />
                            ))}
                          </div>
                        </SortableContext>
                      </GroupDropZone>
                    ) : null}
                  </section>
                ))}
                {filteredApps.length === 0 ? <p className="sidebar-empty-state">{t("app.noAppsMatch")}</p> : null}
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
                    onContextMenu={onOpenContextMenu}
                    themeMode={themeMode}
                    dashboardIconsMetadata={dashboardIconsMetadata}
                    appStatus={appStatuses[app.id]}
                    canManageApps={canManageApps}
                  />
                ))}
                {visibleAppsInCompact.length === 0 ? <p className="sidebar-empty-state">{t("app.noAppsVisible")}</p> : null}
              </div>
            )}
          </SortableContext>
        </div>

        {draggingAppId !== null ? (
          <div className={dragOutProgress > 0 ? "sidebar-trash-hint active" : "sidebar-trash-hint"}>{t("app.dragToDelete")}</div>
        ) : null}

        <div className="sidebar-bottom-actions">
          {canManageApps ? (
            <button className="primary-button sidebar-bottom-button" type="button" onClick={onOpenCreateEditor} title={t("app.new")}>
              {sidebarMode === "expanded" ? t("common.new") : "+"}
            </button>
          ) : null}
          <div ref={actionsMenuRef} className={actionsMenuOpen ? "sidebar-actions-menu open" : "sidebar-actions-menu"}>
            <button
              className="ghost-icon-button sidebar-actions-trigger sidebar-bottom-button"
              type="button"
              onClick={() => setActionsMenuOpen((current) => !current)}
              title={t("common.actions")}
              aria-haspopup="menu"
              aria-expanded={actionsMenuOpen}
              aria-label={t("common.actions")}
            >
              ⚙
            </button>
            {actionsMenuOpen ? (
              <div className="sidebar-actions-popover" role="menu" aria-label={t("common.actions")}>
                {canManageApps ? (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        onOpenJsonImport();
                      }}
                      title={t("app.importJson")}
                    >
                      {t("common.json")}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        onOpenGroupManager();
                      }}
                      title={t("modal.groups")}
                    >
                      {t("modal.groups")}
                    </button>
                    {userRole === "admin" ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          onOpenUserManager();
                        }}
                        title={t("modal.users")}
                      >
                        {t("modal.users")}
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    void onLogout();
                  }}
                  disabled={busy}
                  title={t("auth.signOut")}
                >
                  {t("auth.signOut")}
                </button>
              </div>
            ) : null}
          </div>
          <div className="sidebar-language-switch" aria-label={t("sidebar.language")}>
            <button
              className={lang === "en" ? "sidebar-language-option active" : "sidebar-language-option"}
              type="button"
              onClick={() => setLang("en")}
              aria-label={t("lang.en")}
              title={t("lang.en")}
            >
              EN
            </button>
            <span className="sidebar-language-separator" aria-hidden="true">
              ·
            </span>
            <button
              className={lang === "fr" ? "sidebar-language-option active" : "sidebar-language-option"}
              type="button"
              onClick={() => setLang("fr")}
              aria-label={t("lang.fr")}
              title={t("lang.fr")}
            >
              FR
            </button>
          </div>
          <button className="ghost-icon-button theme-toggle sidebar-bottom-button" type="button" onClick={onToggleTheme} aria-label={t("app.themeToggleAria")} title={t("app.themeToggleTitle")}>
            {themeMode === "light" ? "◐" : "◑"}
          </button>
        </div>
      </aside>
    </>
  );
}
