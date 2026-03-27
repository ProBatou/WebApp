import { useEffect, useRef, useState, startTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type AuthUser = {
  id: number;
  username: string;
};

type AppMode = "iframe" | "external";
type IconVariantMode = "auto" | "base";

type WebAppEntry = {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  icon_variant_mode: IconVariantMode;
  icon_variant_inverted: boolean;
  accent: string;
  open_mode: AppMode;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type BootstrapResponse = {
  needsSetup: boolean;
  user: AuthUser | null;
};

type AppsResponse = {
  items: WebAppEntry[];
};

type ImportAppsResponse = {
  items: WebAppEntry[];
  importedIds: number[];
};

type AppPayload = {
  name: string;
  description: string;
  url: string;
  icon: string;
  iconVariantMode: IconVariantMode;
  iconVariantInverted: boolean;
  accent: string;
  openMode: AppMode;
};

type AppEditorState = AppPayload;
type JsonImportMode = "merge" | "replace";
type JsonModalMode = "import" | "export" | null;
type JsonTransferItem = Partial<AppPayload> & {
  name?: unknown;
  description?: unknown;
  url?: unknown;
  icon?: unknown;
  iconVariantMode?: unknown;
  iconVariantInverted?: unknown;
  accent?: unknown;
  openMode?: unknown;
};

type EditorMode = "create" | "edit";
type SidebarMode = "compact" | "expanded";
type ThemeMode = "light" | "dark";
type DashboardIconMetadata = {
  colors?: {
    light?: string;
    dark?: string;
  };
};

type DashboardIconResolution = {
  icon: string;
  appliedVariant: "light" | "dark" | null;
};

type DashboardIconsMetadataMap = Record<string, DashboardIconMetadata>;

type ContextMenuState = {
  x: number;
  y: number;
  app: WebAppEntry | null;
} | null;

const themeStorageKey = "webapp-v2-theme";
const dashboardIconsMetadataUrl = "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json";
const dashboardIconsCdnBaseUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";
const jsonImportExample = `[
  {
    "name": "Plex",
    "url": "https://plex.example.com",
    "icon": "plex",
    "iconVariantMode": "auto",
    "iconVariantInverted": false,
    "accent": "#cf5c36",
    "openMode": "iframe"
  }
]`;

const emptyEditorState: AppEditorState = {
  name: "",
  description: "",
  url: "https://",
  icon: "",
  iconVariantMode: "auto",
  iconVariantInverted: false,
  accent: "#cf5c36",
  openMode: "iframe",
};

function isDashboardIconSlug(value: string) {
  return /^[a-z0-9-]+$/.test(value.trim());
}

function getDashboardIconUrl(icon: string) {
  return `${dashboardIconsCdnBaseUrl}/${icon}.svg`;
}

function getDashboardIconAssetUrls(icon: string) {
  return [
    `${dashboardIconsCdnBaseUrl}/${icon}.svg`,
    `${dashboardIconsCdnBaseUrl.replace(/\/svg$/, "/png")}/${icon}.png`,
  ];
}

function getFaviconCandidates(url: string) {
  try {
    const parsedUrl = new URL(url);
    return [
      new URL("/favicon.ico", parsedUrl.origin).toString(),
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=128`,
    ];
  } catch {
    return [];
  }
}

function getDashboardIconBaseSlug(icon: string) {
  return icon.endsWith("-light") ? icon.slice(0, -6) : icon;
}

function getDashboardIconVariants(icon: string, metadataMap: DashboardIconsMetadataMap) {
  const baseIcon = getDashboardIconBaseSlug(icon);
  const metadata = metadataMap[icon] ?? metadataMap[baseIcon];

  return {
    baseIcon,
    lightBackgroundIcon: metadata?.colors?.dark ?? baseIcon,
    darkBackgroundIcon: metadata?.colors?.light ?? (baseIcon.endsWith("-light") ? baseIcon : `${baseIcon}-light`),
    hasVariants: Boolean(metadata?.colors?.light || metadata?.colors?.dark || icon.endsWith("-light")),
  };
}

function resolveDashboardIcon(
  icon: string,
  themeMode: ThemeMode,
  metadataMap: DashboardIconsMetadataMap,
  iconVariantMode: IconVariantMode,
  iconVariantInverted: boolean
): DashboardIconResolution {
  if (iconVariantMode === "base") {
    return {
      icon: getDashboardIconBaseSlug(icon),
      appliedVariant: null,
    };
  }

  const variants = getDashboardIconVariants(icon, metadataMap);

  const variantKey = themeMode === "light" ? "dark" : "light";
  const effectiveVariantKey = iconVariantInverted ? (variantKey === "light" ? "dark" : "light") : variantKey;
  const resolvedIcon = effectiveVariantKey === "light" ? variants.darkBackgroundIcon : variants.lightBackgroundIcon;

  return {
    icon: resolvedIcon,
    appliedVariant: resolvedIcon === variants.baseIcon ? null : effectiveVariantKey,
  };
}

function getDashboardIconAssetCandidates(icon: string, metadataMap: DashboardIconsMetadataMap) {
  const variants = getDashboardIconVariants(icon, metadataMap);

  return Array.from(
    new Set(
      [variants.baseIcon, variants.darkBackgroundIcon, variants.lightBackgroundIcon].filter((value): value is string => Boolean(value))
    )
  );
}

function getDashboardIconPreviewVariants(icon: string, metadataMap: DashboardIconsMetadataMap) {
  return getDashboardIconVariants(icon, metadataMap);
}

function getEffectivePreviewVariants(previewVariants: ReturnType<typeof getDashboardIconPreviewVariants>, iconVariantInverted: boolean) {
  if (!iconVariantInverted) {
    return previewVariants;
  }

  return {
    ...previewVariants,
    lightBackgroundIcon: previewVariants.darkBackgroundIcon,
    darkBackgroundIcon: previewVariants.lightBackgroundIcon,
  };
}

function getFallbackIconLabel(name: string, existingIcon?: string) {
  const trimmedIcon = existingIcon?.trim();
  if (trimmedIcon && !isDashboardIconSlug(trimmedIcon)) {
    return trimmedIcon.slice(0, 3).toUpperCase();
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3);
  }

  return "WA";
}

function formatDashboardIconLabel(icon: string) {
  return icon
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeIconSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findBestDashboardIconMatch(name: string, icons: string[]) {
  const normalizedName = normalizeIconSearchValue(name);
  if (!normalizedName) {
    return "";
  }

  const exactMatch = icons.find((icon) => icon === normalizedName);
  if (exactMatch) {
    return exactMatch;
  }

  const startsWithMatch = icons.find((icon) => icon.startsWith(`${normalizedName}-`) || icon.startsWith(normalizedName));
  if (startsWithMatch) {
    return startsWithMatch;
  }

  const words = normalizedName.split("-").filter(Boolean);
  if (words.length > 1) {
    const compactName = words.join("");
    const compactMatch = icons.find((icon) => icon.replace(/-/g, "") === compactName);
    if (compactMatch) {
      return compactMatch;
    }
  }

  const containsMatch = icons.find((icon) => words.every((word) => icon.includes(word)));
  return containsMatch ?? "";
}

function getSuggestedDashboardIcon(searchValue: string, icons: string[]) {
  const normalizedSearch = normalizeIconSearchValue(searchValue);
  if (!normalizedSearch) {
    return "";
  }

  return findBestDashboardIconMatch(searchValue, icons) || normalizedSearch;
}

function isAppMode(value: unknown): value is AppMode {
  return value === "iframe" || value === "external";
}

function isIconVariantMode(value: unknown): value is IconVariantMode {
  return value === "auto" || value === "base";
}

function isAccentColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

function exportAppsToJson(apps: WebAppEntry[]) {
  return JSON.stringify(
    apps.map((app) => ({
      name: app.name,
      description: app.description,
      url: app.url,
      icon: app.icon,
      iconVariantMode: app.icon_variant_mode,
      iconVariantInverted: app.icon_variant_inverted,
      accent: app.accent,
      openMode: app.open_mode,
    })),
    null,
    2
  );
}

function parseImportedApps(rawValue: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error("JSON invalide.");
  }

  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : null;

  if (!items) {
    throw new Error("Le JSON doit etre un tableau ou un objet avec items.");
  }

  if (items.length === 0) {
    throw new Error("Aucune application a importer.");
  }

  return items.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Entree ${index + 1}: format invalide.`);
    }

    const item = entry as JsonTransferItem;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const icon = typeof item.icon === "string" ? item.icon.trim() : "";
    const iconVariantMode = isIconVariantMode(item.iconVariantMode) ? item.iconVariantMode : "auto";
    const iconVariantInverted = typeof item.iconVariantInverted === "boolean" ? item.iconVariantInverted : false;
    const accent = typeof item.accent === "string" && isAccentColor(item.accent) ? item.accent : emptyEditorState.accent;
    const openMode = isAppMode(item.openMode) ? item.openMode : emptyEditorState.openMode;

    if (name.length < 2) {
      throw new Error(`Entree ${index + 1}: nom invalide.`);
    }

    if (!url) {
      throw new Error(`Entree ${index + 1}: URL manquante.`);
    }

    try {
      new URL(url);
    } catch {
      throw new Error(`Entree ${index + 1}: URL invalide.`);
    }

    const resolvedIcon = icon || getFallbackIconLabel(name);
    if (!/^[A-Za-z0-9-]+$/.test(resolvedIcon)) {
      throw new Error(`Entree ${index + 1}: icone invalide.`);
    }

    return {
      name,
      description,
      url,
      icon: resolvedIcon,
      iconVariantMode,
      iconVariantInverted,
      accent,
      openMode,
    } satisfies AppPayload;
  });
}

async function apiFetch<T>(input: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined;

  const response = await fetch(input, {
    credentials: "include",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = (await response.json().catch(() => null)) as T | { message?: string } | null;

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? data.message : "Erreur API.";
    throw new Error(message ?? "Erreur API.");
  }

  return data as T;
}

function AppIcon({
  icon,
  name,
  url,
  accent,
  themeMode,
  dashboardIconsMetadata,
  iconVariantMode,
  iconVariantInverted,
}: {
  icon: string;
  name: string;
  url: string;
  accent: string;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  iconVariantMode: IconVariantMode;
  iconVariantInverted: boolean;
}) {
  const [dashboardAssetIndex, setDashboardAssetIndex] = useState(0);
  const [faviconIndex, setFaviconIndex] = useState(0);
  const baseIcon = getDashboardIconBaseSlug(icon);
  const desiredIcon = isDashboardIconSlug(icon)
    ? resolveDashboardIcon(icon, themeMode, dashboardIconsMetadata, iconVariantMode, iconVariantInverted).icon
    : icon;
  const dashboardAssetUrls = isDashboardIconSlug(desiredIcon)
    ? Array.from(
        new Set([
          ...getDashboardIconAssetUrls(desiredIcon),
          ...(desiredIcon !== baseIcon ? getDashboardIconAssetUrls(baseIcon) : []),
        ])
      )
    : [];
  const dashboardIconUrl = dashboardAssetUrls[dashboardAssetIndex] ?? "";
  const dashboardIcon = Boolean(dashboardIconUrl);
  const faviconCandidates = getFaviconCandidates(url);
  const faviconUrl = !dashboardIcon ? (faviconCandidates[faviconIndex] ?? "") : "";
  const fallbackLabel = getFallbackIconLabel(name, icon);

  useEffect(() => {
    setDashboardAssetIndex(0);
    setFaviconIndex(0);
  }, [desiredIcon, baseIcon, url]);

  const imageSurface = dashboardIcon || Boolean(faviconUrl);
  const iconClassName = imageSurface ? "app-icon dashboard-icon-surface" : "app-icon";
  const iconStyle = imageSurface ? undefined : { backgroundColor: accent };

  return (
    <span className={iconClassName} style={iconStyle} title={dashboardIcon ? dashboardIconUrl : faviconUrl || undefined}>
      {dashboardIcon ? (
        <img
          key={dashboardIconUrl}
          className="app-icon-image"
          src={dashboardIconUrl}
          alt=""
          loading="lazy"
          onError={() => {
            setDashboardAssetIndex((current) => current + 1);
          }}
        />
      ) : faviconUrl ? (
        <img
          key={faviconUrl}
          className="app-icon-image"
          src={faviconUrl}
          alt=""
          loading="lazy"
          onError={() => {
            setFaviconIndex((current) => current + 1);
          }}
        />
      ) : (
        fallbackLabel
      )}
    </span>
  );
}

function DashboardIconPreviewImage({
  icon,
  fallbackIcon,
  className,
}: {
  icon: string;
  fallbackIcon: string;
  className?: string;
}) {
  const assetUrls = Array.from(new Set([...getDashboardIconAssetUrls(icon), ...getDashboardIconAssetUrls(fallbackIcon)]));
  const [assetIndex, setAssetIndex] = useState(0);
  const currentAssetUrl = assetUrls[assetIndex] ?? "";

  useEffect(() => {
    setAssetIndex(0);
  }, [icon, fallbackIcon]);

  if (!currentAssetUrl) {
    return null;
  }

  return (
    <img
      key={currentAssetUrl}
      className={className}
      src={currentAssetUrl}
      alt=""
      loading="lazy"
      onError={() => {
        setAssetIndex((current) => current + 1);
      }}
    />
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
  iconVariantMode,
  iconVariantInverted,
}: {
  app: WebAppEntry;
  active: boolean;
  compact: boolean;
  onSelect: (app: WebAppEntry) => void;
  onEdit: (app: WebAppEntry) => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>, app: WebAppEntry) => void;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  iconVariantMode: IconVariantMode;
  iconVariantInverted: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const constrainedTransform = transform
    ? {
        ...transform,
        x: 0,
      }
    : null;

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
          iconVariantMode={iconVariantMode}
          iconVariantInverted={iconVariantInverted}
        />
        {!compact ? (
          <span className="app-meta">
            <strong>{app.name}</strong>
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

function DragOverlayTile({
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

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [apps, setApps] = useState<WebAppEntry[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("expanded");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return storedTheme === "dark" ? "dark" : "light";
  });
  const [mountedIframeIds, setMountedIframeIds] = useState<number[]>([]);
  const [iframeReloadTokens, setIframeReloadTokens] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<AppEditorState>(emptyEditorState);
  const [jsonModalMode, setJsonModalMode] = useState<JsonModalMode>(null);
  const [jsonImportMode, setJsonImportMode] = useState<JsonImportMode>("merge");
  const [jsonValue, setJsonValue] = useState("");
  const [jsonModalError, setJsonModalError] = useState<string | null>(null);
  const [jsonModalInfo, setJsonModalInfo] = useState<string | null>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [debouncedIconQuery, setDebouncedIconQuery] = useState("");
  const [iconSelectionLocked, setIconSelectionLocked] = useState(false);
  const [dashboardIconsMetadata, setDashboardIconsMetadata] = useState<DashboardIconsMetadataMap>({});
  const [dashboardIcons, setDashboardIcons] = useState<string[]>([]);
  const [dashboardIconsLoading, setDashboardIconsLoading] = useState(false);
  const [dashboardIconsError, setDashboardIconsError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [draggingAppId, setDraggingAppId] = useState<number | null>(null);
  const [dragOutProgress, setDragOutProgress] = useState(0);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selectedApp = apps.find((item) => item.id === selectedAppId) ?? null;
  const normalizedIconQuery = debouncedIconQuery.trim().toLowerCase();
  const filteredDashboardIcons = normalizedIconQuery
    ? dashboardIcons.filter((icon) => icon.includes(normalizedIconQuery)).slice(0, 8)
    : [];
  const hasDashboardIconsInUse = apps.some((app) => isDashboardIconSlug(app.icon)) || isDashboardIconSlug(editorState.icon);
  const selectedIconResolution = isDashboardIconSlug(editorState.icon)
    ? resolveDashboardIcon(
        editorState.icon,
        themeMode,
        dashboardIconsMetadata,
        editorState.iconVariantMode,
        editorState.iconVariantInverted
      )
    : { icon: editorState.icon, appliedVariant: null };
  const selectedIconPreviewVariants = isDashboardIconSlug(editorState.icon)
    ? getDashboardIconPreviewVariants(editorState.icon, dashboardIconsMetadata)
    : null;
  const effectiveSelectedIconPreviewVariants = selectedIconPreviewVariants
    ? getEffectivePreviewVariants(selectedIconPreviewVariants, editorState.iconVariantInverted)
    : null;
  const draggedApp = draggingAppId === null ? null : apps.find((item) => item.id === draggingAppId) ?? null;
  const mountedIframeApps = mountedIframeIds
    .map((iframeId) => apps.find((item) => item.id === iframeId && item.open_mode === "iframe") ?? null)
    .filter((app): app is WebAppEntry => app !== null);

  const toggleThemeMode = () => {
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  const closeJsonModal = () => {
    setJsonModalMode(null);
    setJsonModalError(null);
    setJsonModalInfo(null);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedIconQuery(iconQuery);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [iconQuery]);

  useEffect(() => {
    if (!sidebarOpen) {
      setContextMenu(null);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (!selectedApp || selectedApp.open_mode !== "iframe") {
      return;
    }

    setMountedIframeIds((current) => (current.includes(selectedApp.id) ? current : [...current, selectedApp.id]));
  }, [selectedApp]);

  useEffect(() => {
    setMountedIframeIds((current) => current.filter((iframeId) => apps.some((item) => item.id === iframeId && item.open_mode === "iframe")));
  }, [apps]);

  useEffect(() => {
    setIframeReloadTokens((current) => {
      const nextEntries = Object.entries(current).filter(([appId]) => apps.some((item) => item.id === Number(appId) && item.open_mode === "iframe"));
      return nextEntries.length === Object.keys(current).length ? current : Object.fromEntries(nextEntries);
    });
  }, [apps]);

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
  }, [editorOpen, jsonModalMode]);

  useEffect(() => {
    if ((!editorOpen && !hasDashboardIconsInUse) || dashboardIcons.length > 0 || dashboardIconsLoading) {
      return;
    }

    const controller = new AbortController();

    const loadDashboardIcons = async () => {
      try {
        setDashboardIconsLoading(true);
        setDashboardIconsError(null);

        const response = await fetch(dashboardIconsMetadataUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Impossible de charger Dashboard Icons.");
        }

        const metadata = (await response.json()) as DashboardIconsMetadataMap;
        setDashboardIconsMetadata(metadata);
        setDashboardIcons(Object.keys(metadata).sort((left, right) => left.localeCompare(right)));
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setDashboardIconsError(loadError instanceof Error ? loadError.message : "Impossible de charger Dashboard Icons.");
      } finally {
        if (!controller.signal.aborted) {
          setDashboardIconsLoading(false);
        }
      }
    };

    void loadDashboardIcons();

    return () => controller.abort();
  }, [dashboardIcons.length, dashboardIconsLoading, editorOpen, hasDashboardIconsInUse]);

  useEffect(() => {
    if (!editorOpen || iconSelectionLocked || !normalizedIconQuery) {
      return;
    }

    const nextIcon = getSuggestedDashboardIcon(normalizedIconQuery, dashboardIcons);
    if (!nextIcon || nextIcon === editorState.icon) {
      return;
    }

    setEditorState((current) => ({ ...current, icon: nextIcon }));
    setIconQuery(nextIcon);
  }, [dashboardIcons, editorOpen, editorState.icon, iconSelectionLocked, normalizedIconQuery]);

  useEffect(() => {
    const iconsToPreload = new Set<string>();

    apps.forEach((app) => {
      if (isDashboardIconSlug(app.icon)) {
        getDashboardIconAssetCandidates(app.icon, dashboardIconsMetadata).forEach((icon) => iconsToPreload.add(icon));
      }
    });

    if (isDashboardIconSlug(editorState.icon)) {
      getDashboardIconAssetCandidates(editorState.icon, dashboardIconsMetadata).forEach((icon) => iconsToPreload.add(icon));
    }

    filteredDashboardIcons.forEach((icon) => {
      getDashboardIconAssetCandidates(icon, dashboardIconsMetadata).forEach((candidate) => iconsToPreload.add(candidate));
    });

    iconsToPreload.forEach((icon) => {
      const image = new Image();
      image.decoding = "async";
      image.src = getDashboardIconUrl(icon);
    });
  }, [apps, dashboardIconsMetadata, editorState.icon, filteredDashboardIcons]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFetch<BootstrapResponse>("/api/bootstrap", { method: "GET" });
        setNeedsSetup(result.needsSetup);
        setUser(result.user);

        if (result.user) {
          const appsResult = await apiFetch<AppsResponse>("/api/apps", { method: "GET" });
          setApps(appsResult.items);
          setSelectedAppId((current) => current ?? appsResult.items[0]?.id ?? null);
        }
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const reloadApps = async (preferSelectedId?: number | null) => {
    const appsResult = await apiFetch<AppsResponse>("/api/apps", { method: "GET" });
    setApps(appsResult.items);

    const nextId = preferSelectedId && appsResult.items.some((item) => item.id === preferSelectedId)
      ? preferSelectedId
      : appsResult.items[0]?.id ?? null;

    startTransition(() => {
      setSelectedAppId(nextId);
    });
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setBusy(true);
      setAuthError(null);

      const endpoint = needsSetup ? "/api/setup" : "/api/login";
      const result = await apiFetch<{ user: AuthUser }>(endpoint, {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      setUser(result.user);
      setNeedsSetup(false);
      await reloadApps();
      setCredentials({ username: "", password: "" });
    } catch (submitError) {
      setAuthError(submitError instanceof Error ? submitError.message : "Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      setBusy(true);
      await apiFetch<null>("/api/logout", { method: "POST" });
      setUser(null);
      setApps([]);
      setSelectedAppId(null);
      setMountedIframeIds([]);
      setIframeReloadTokens({});
      setEditorOpen(false);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Erreur de deconnexion.");
    } finally {
      setBusy(false);
    }
  };

  const handleSelectApp = (app: WebAppEntry) => {
    setContextMenu(null);
    setSidebarOpen(false);

    startTransition(() => {
      setSelectedAppId(app.id);
    });

    if (app.open_mode === "external") {
      window.open(app.url, "_blank", "noopener,noreferrer");
      return;
    }
  };

  const refreshIframeApp = (app: WebAppEntry) => {
    if (app.open_mode !== "iframe") {
      return;
    }

    setContextMenu(null);
    setMountedIframeIds((current) => (current.includes(app.id) ? current : [...current, app.id]));
    setIframeReloadTokens((current) => ({
      ...current,
      [app.id]: (current[app.id] ?? 0) + 1,
    }));
  };

  const openCreateEditor = () => {
    setContextMenu(null);
    closeJsonModal();
    setEditorMode("create");
    setEditingId(null);
    setEditorState(emptyEditorState);
    setIconQuery("");
    setDebouncedIconQuery("");
    setIconSelectionLocked(false);
    setEditorOpen(true);
  };

  const openEditEditor = (app: WebAppEntry) => {
    setContextMenu(null);
    closeJsonModal();
    setEditorMode("edit");
    setEditingId(app.id);
    setEditorState({
      name: app.name,
      description: app.description,
      url: app.url,
      icon: app.icon,
      iconVariantMode: app.icon_variant_mode,
      iconVariantInverted: app.icon_variant_inverted,
      accent: app.accent,
      openMode: app.open_mode,
    });
    setIconQuery(isDashboardIconSlug(app.icon) ? app.icon : "");
    setDebouncedIconQuery(isDashboardIconSlug(app.icon) ? app.icon : "");
    setIconSelectionLocked(Boolean(app.icon));
    setEditorOpen(true);
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

  const handleJsonFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleImportJson = async () => {
    try {
      setBusy(true);
      setError(null);
      setJsonModalError(null);
      setJsonModalInfo(null);

      const importedItems = parseImportedApps(jsonValue);
      if (
        jsonImportMode === "replace" &&
        apps.length > 0 &&
        !window.confirm(`Remplacer ${apps.length} application${apps.length > 1 ? "s" : ""} par ${importedItems.length} nouvelle${importedItems.length > 1 ? "s" : ""} entree${importedItems.length > 1 ? "s" : ""} ?`)
      ) {
        return;
      }

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

  const handleSaveApp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setBusy(true);
      setError(null);

      const resolvedIcon = editorState.icon.trim() || getFallbackIconLabel(editorState.name, editorState.icon);

      const endpoint = editorMode === "create" ? "/api/apps" : `/api/apps/${editingId}`;
      const method = editorMode === "create" ? "POST" : "PUT";
      const result = await apiFetch<{ item: WebAppEntry }>(endpoint, {
        method,
        body: JSON.stringify({
          ...editorState,
          icon: resolvedIcon,
          iconVariantMode: editorState.iconVariantMode,
          iconVariantInverted: editorState.iconVariantInverted,
        }),
      });

      await reloadApps(result.item.id);
      setEditorOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erreur d'enregistrement.");
    } finally {
      setBusy(false);
    }
  };

  const deleteApp = async (appId: number) => {
    const app = apps.find((item) => item.id === appId);
    if (!app) {
      return;
    }

    try {
      setBusy(true);
      setContextMenu(null);
      await apiFetch<null>(`/api/apps/${appId}`, { method: "DELETE" });
      await reloadApps(selectedAppId === appId ? null : selectedAppId);
      closeEditor();
      setEditingId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erreur de suppression.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!editingId) {
      return;
    }

    await deleteApp(editingId);
  };

  const openContextMenu = (event: React.MouseEvent<HTMLDivElement>, app: WebAppEntry) => {
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

  const openSidebarContextMenu = (event: React.MouseEvent<HTMLElement>) => {
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

  const handleReorder = async (event: DragEndEvent) => {
    setDraggingAppId(null);
    setDragOutProgress(0);

    const { active, over } = event;
    const activeId = Number(active.id);
    if (Number.isNaN(activeId)) {
      return;
    }

    if (isDroppedOutsideSidebar(event)) {
      await deleteApp(activeId);
      return;
    }

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = apps.findIndex((item) => item.id === activeId);
    const newIndex = apps.findIndex((item) => item.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(apps, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));

    setApps(reordered);

    try {
      await apiFetch<AppsResponse>("/api/apps/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedIds: reordered.map((item) => item.id) }),
      });
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Erreur de reorganisation.");
      await reloadApps(selectedAppId);
    }
  };

  if (loading) {
    return <div className="full-screen-state">Chargement de WebApp V2...</div>;
  }

  if (error && !user) {
    return <div className="full-screen-state error-state">{error}</div>;
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <section className="auth-panel auth-card form-panel">
          <div className="auth-card-header">
            <div>
              <p className="eyebrow">{needsSetup ? "Initialisation" : "Connexion"}</p>
              <h1 className="auth-title">WebApp</h1>
            </div>
            <div className="auth-header-actions">
              <button className="ghost-icon-button theme-toggle" type="button" onClick={toggleThemeMode} aria-label="Basculer le theme">
                {themeMode === "light" ? "◐" : "◑"}
              </button>
              <div className="auth-mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div className="auth-copy-block">
            <h2>{needsSetup ? "Creer le premier compte" : "Entrer dans le dashboard"}</h2>
            <p className="auth-subtitle">
              {needsSetup ? "Configure l'acces initial a ton portail personnel." : "Connecte-toi pour retrouver tes applications dans une interface epuree."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              <span>Nom d'utilisateur</span>
              <input
                type="text"
                value={credentials.username}
                onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
                minLength={3}
                maxLength={32}
                required
              />
            </label>
            <label>
              <span>Mot de passe</span>
              <input
                type="password"
                value={credentials.password}
                onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            {authError ? <p className="form-error">{authError}</p> : null}
            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {needsSetup ? "Creer le compte" : "Se connecter"}
            </button>
          </form>

          <div className="auth-footer-note">
            <span className="auth-footer-dot" />
            <p>{needsSetup ? "Configuration initiale unique." : "Session securisee."}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragCancel={handleDragCancel}
      onDragEnd={handleReorder}
    >
      <div className="app-shell" onClick={() => setContextMenu(null)}>
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
        onContextMenu={openSidebarContextMenu}
        onMouseLeave={() => {
          if (!contextMenu && draggingAppId === null) {
            setSidebarOpen(false);
          }
        }}
      >
        <div className="brand-block">
          {sidebarMode === "expanded" ? (
            <div className="brand-copy">
              <p className="eyebrow">Connecte en tant que</p>
              <h1>{user.username}</h1>
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
          <SortableContext items={apps.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="app-list">
              {apps.map((app) => (
                <SortableAppTile
                  key={app.id}
                  app={app}
                  active={app.id === selectedAppId}
                  compact={sidebarMode === "compact"}
                  onSelect={handleSelectApp}
                  onEdit={openEditEditor}
                  onContextMenu={openContextMenu}
                  themeMode={themeMode}
                  dashboardIconsMetadata={dashboardIconsMetadata}
                  iconVariantMode={app.icon_variant_mode}
                  iconVariantInverted={app.icon_variant_inverted}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        {draggingAppId !== null ? (
          <div className={dragOutProgress > 0 ? "sidebar-trash-hint active" : "sidebar-trash-hint"}>Sortir a droite pour supprimer</div>
        ) : null}

        <div className="sidebar-bottom-actions">
          <button className="primary-button" type="button" onClick={openCreateEditor} title="Nouvelle app">
            {sidebarMode === "expanded" ? "Nouvelle" : "+"}
          </button>
          <button className="secondary-button" type="button" onClick={openJsonImport} title="Importer JSON">
            {sidebarMode === "expanded" ? "JSON" : "{}"}
          </button>
          <button className="secondary-button" type="button" onClick={handleLogout} disabled={busy} title="Deconnexion">
            {sidebarMode === "expanded" ? "Quitter" : "⏻"}
          </button>
          <button className="ghost-icon-button theme-toggle" type="button" onClick={toggleThemeMode} aria-label="Basculer le theme" title="Dark mode">
            {themeMode === "light" ? "◐" : "◑"}
          </button>
        </div>

      </aside>

      <main className="workspace immersive-workspace">
        <div className="workspace-grid">
          <section className="viewer-panel">
            {error ? <div className="inline-banner error-state floating-banner">{error}</div> : null}

            {!selectedApp ? <div className="empty-state">Selectionne ou cree une application.</div> : null}
            {selectedApp?.open_mode === "iframe" ? (
              <div className="iframe-stack">
                {mountedIframeApps.map((app) => (
                  <iframe
                    key={`${app.id}-${iframeReloadTokens[app.id] ?? 0}`}
                    className={app.id === selectedApp.id ? "app-frame active" : "app-frame inactive"}
                    src={app.url}
                    title={app.name}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ))}
              </div>
            ) : null}
            {selectedApp?.open_mode === "external" ? (
              <div className="empty-state external-state">
                <p>Cette application est configuree pour s'ouvrir hors de WebApp.</p>
                <a className="primary-button" href={selectedApp.url} target="_blank" rel="noreferrer">
                  Lancer {selectedApp.name}
                </a>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {contextMenu ? (
        <div
          className="sidebar-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          role="menu"
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.app ? (
            <>
              {contextMenu.app.open_mode === "iframe" ? (
                <button type="button" className="sidebar-context-item" onClick={() => refreshIframeApp(contextMenu.app!)}>
                  Rafraichir
                </button>
              ) : null}
              <button type="button" className="sidebar-context-item" onClick={() => openEditEditor(contextMenu.app!)}>
                Editer
              </button>
              <button type="button" className="sidebar-context-item" onClick={() => void deleteApp(contextMenu.app!.id)}>
                Supprimer
              </button>
            </>
          ) : null}
          <button type="button" className="sidebar-context-item" onClick={openCreateEditor}>
            Nouvelle app
          </button>
          {!contextMenu.app ? (
            <>
              <button type="button" className="sidebar-context-item" onClick={openJsonImport}>
                Importer JSON
              </button>
              <button type="button" className="sidebar-context-item" onClick={openJsonExport}>
                Exporter JSON
              </button>
              <button
                type="button"
                className="sidebar-context-item"
                onClick={() => {
                  setContextMenu(null);
                  setSidebarMode((current) => (current === "expanded" ? "compact" : "expanded"));
                }}
              >
                {sidebarMode === "expanded" ? "Passer en compact" : "Passer en etendu"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {editorOpen ? (
        <div className="editor-modal-overlay" onClick={closeEditor} role="presentation">
          <aside className="editor-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
            <div className="editor-header">
              <div>
                <p className="eyebrow">Administration</p>
                <h3>{editorMode === "create" ? "Nouvelle app" : "Modifier l'app"}</h3>
              </div>
              <button className="ghost-icon-button" type="button" onClick={closeEditor}>
                Fermer
              </button>
            </div>

            <form className="editor-form" onSubmit={handleSaveApp}>
              <label>
                <span>Nom</span>
                <input
                  type="text"
                  value={editorState.name}
                  onChange={(event) => setEditorState((current) => ({ ...current, name: event.target.value }))}
                  minLength={2}
                  maxLength={64}
                  required
                />
              </label>
              <label>
                <span>URL</span>
                <input
                  type="url"
                  value={editorState.url}
                  onChange={(event) => setEditorState((current) => ({ ...current, url: event.target.value }))}
                  required
                />
              </label>
              <div className="form-row editor-logo-row">
                <label>
                  <span>Logo</span>
                  <input
                    type="text"
                    value={iconQuery}
                    onChange={(event) => {
                      setIconSelectionLocked(false);
                      setIconQuery(event.target.value.toLowerCase());
                    }}
                    placeholder="Chercher sur Dashboard Icons"
                    autoComplete="off"
                  />
                  <div className="editor-field-note">
                    <a href="https://dashboardicons.com/icons" target="_blank" rel="noreferrer">
                      Ouvrir le catalogue
                    </a>
                  </div>
                </label>
                <div className="editor-logo-side">
                  <label>
                  <span aria-hidden="true">&nbsp;</span>
                  <input
                    type="color"
                    value={editorState.accent}
                    onChange={(event) => setEditorState((current) => ({ ...current, accent: event.target.value }))}
                    title="Couleur"
                    aria-label="Couleur"
                  />
                  </label>
                </div>
              </div>
              <div className="icon-search-panel">
                {dashboardIconsError ? <p className="form-error">{dashboardIconsError}</p> : null}

                {!dashboardIconsLoading && filteredDashboardIcons.length > 0 ? (
                  <div className="icon-search-results">
                    {filteredDashboardIcons.map((icon) => {
                      const previewVariants = getDashboardIconPreviewVariants(icon, dashboardIconsMetadata);

                      return (
                        <button
                          key={icon}
                          type="button"
                          className={editorState.icon === icon ? "icon-search-item active" : "icon-search-item"}
                          onClick={() => {
                            setIconSelectionLocked(true);
                            setEditorState((current) => ({ ...current, icon }));
                            setIconQuery(icon);
                            setDebouncedIconQuery(icon);
                          }}
                        >
                          <span className="icon-search-preview-stack">
                            <span className="icon-search-preview icon-search-preview-light" title="Version pour fond clair">
                              <DashboardIconPreviewImage
                                icon={previewVariants.lightBackgroundIcon}
                                fallbackIcon={previewVariants.baseIcon}
                              />
                            </span>
                            <span className="icon-search-preview icon-search-preview-dark" title="Version pour fond sombre">
                              <DashboardIconPreviewImage
                                icon={previewVariants.darkBackgroundIcon}
                                fallbackIcon={previewVariants.baseIcon}
                              />
                            </span>
                          </span>
                          <span className="icon-search-copy">
                            <strong>{formatDashboardIconLabel(icon)}</strong>
                            <small>{icon}</small>
                          </span>
                          {previewVariants.hasVariants ? <span className="icon-variant-badge">light/dark</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <label>
                <span>Mode d'ouverture</span>
                <select
                  value={editorState.openMode}
                  onChange={(event) => setEditorState((current) => ({ ...current, openMode: event.target.value as AppMode }))}
                >
                  <option value="iframe">Iframe integree</option>
                  <option value="external">Nouvel onglet</option>
                </select>
              </label>

              <div className="preview-card">
                {!selectedIconPreviewVariants ? (
                  <AppIcon
                    icon={editorState.icon}
                    name={editorState.name}
                    url={editorState.url}
                    accent={editorState.accent}
                    themeMode={themeMode}
                    dashboardIconsMetadata={dashboardIconsMetadata}
                    iconVariantMode={editorState.iconVariantMode}
                    iconVariantInverted={editorState.iconVariantInverted}
                  />
                ) : null}
                <div className="preview-card-content">
                  <div className="preview-card-top">
                    <div className="preview-card-copy">
                      <strong>{editorState.name || "Nom de l'application"}</strong>
                    </div>
                    {editorState.icon ? (
                      <div className="preview-card-actions">
                        {effectiveSelectedIconPreviewVariants ? (
                        <button
                          className={editorState.iconVariantInverted ? "secondary-button icon-invert-button active" : "secondary-button icon-invert-button"}
                          type="button"
                          onClick={() => {
                            setEditorState((current) => ({
                              ...current,
                              iconVariantInverted: !current.iconVariantInverted,
                              iconVariantMode: current.iconVariantMode === "base" ? "auto" : current.iconVariantMode,
                            }));
                          }}
                        >
                          {editorState.iconVariantInverted ? "Normal" : "Inversé"}                        </button>
                        ) : null}
                        <button
                          className="secondary-button icon-reset-button"
                          type="button"
                          onClick={() => {
                            setEditorState((current) => ({ ...current, icon: "" }));
                            setIconQuery("");
                            setDebouncedIconQuery("");
                            setIconSelectionLocked(false);
                          }}
                        >
                          Retirer le logo
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {effectiveSelectedIconPreviewVariants ? (
                    <div className="selected-icon-variants-grid preview-variants-grid">
                      <div className={themeMode === "light" ? "selected-icon-variant-card active" : "selected-icon-variant-card"}>
                        <span className="selected-icon-variant-preview icon-search-preview-light">
                          <DashboardIconPreviewImage
                            icon={effectiveSelectedIconPreviewVariants.lightBackgroundIcon}
                            fallbackIcon={effectiveSelectedIconPreviewVariants.baseIcon}
                          />
                        </span>
                        <div>
                          <strong>Fond clair</strong>
                        </div>
                      </div>
                      <div className={themeMode === "dark" ? "selected-icon-variant-card active" : "selected-icon-variant-card"}>
                        <span className="selected-icon-variant-preview icon-search-preview-dark">
                          <DashboardIconPreviewImage
                            icon={effectiveSelectedIconPreviewVariants.darkBackgroundIcon}
                            fallbackIcon={effectiveSelectedIconPreviewVariants.baseIcon}
                          />
                        </span>
                        <div>
                          <strong>Fond sombre</strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="editor-actions">
                <button className="primary-button" type="submit" disabled={busy}>
                  {editorMode === "create" ? "Ajouter" : "Enregistrer"}
                </button>
                <button className="secondary-button" type="button" onClick={openCreateEditor}>
                  Reinitialiser
                </button>
                {editorMode === "edit" ? (
                  <button className="danger-button" type="button" onClick={handleDeleteApp} disabled={busy}>
                    Supprimer
                  </button>
                ) : null}
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {jsonModalMode ? (
        <div className="editor-modal-overlay" onClick={closeJsonModal} role="presentation">
          <aside className="editor-modal json-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
            <div className="editor-header">
              <div>
                <p className="eyebrow">Administration</p>
                <h3>{jsonModalMode === "import" ? "Importer des apps" : "Exporter les apps"}</h3>
              </div>
            </div>

            <div className="json-panel">
              {jsonModalMode === "import" ? (
                <div className="json-toolbar">
                  <div className="json-segmented" role="tablist" aria-label="Mode d'import">
                    <button
                      className={jsonImportMode === "merge" ? "icon-variant-option active" : "icon-variant-option"}
                      type="button"
                      onClick={() => setJsonImportMode("merge")}
                    >
                      Fusionner
                    </button>
                    <button
                      className={jsonImportMode === "replace" ? "icon-variant-option active" : "icon-variant-option"}
                      type="button"
                      onClick={() => setJsonImportMode("replace")}
                    >
                      Remplacer
                    </button>
                  </div>

                  <div className="json-toolbar-actions">
                    <input
                      ref={jsonFileInputRef}
                      className="json-file-input"
                      type="file"
                      accept="application/json,.json"
                      onChange={handleJsonFileChange}
                    />
                    <button className="secondary-button" type="button" onClick={() => jsonFileInputRef.current?.click()}>
                      Charger un fichier
                    </button>
                    <button className="secondary-button" type="button" onClick={openJsonExport}>
                      Exporter
                    </button>
                    <button className="ghost-icon-button" type="button" onClick={() => setJsonValue(jsonImportExample)} title="Exemple JSON">
                      Exemple
                    </button>
                  </div>
                </div>
              ) : (
                <div className="json-toolbar export-toolbar">
                  <p className="json-summary">{apps.length} application{apps.length > 1 ? "s" : ""} dans l'ordre actuel.</p>
                  <div className="json-toolbar-actions">
                    <button className="secondary-button" type="button" onClick={handleCopyExportJson}>
                      Copier
                    </button>
                  </div>
                </div>
              )}

              {jsonModalError ? <p className="form-error">{jsonModalError}</p> : null}
              {jsonModalInfo ? <p className="json-summary">{jsonModalInfo}</p> : null}

              <label>
                <span>{jsonModalMode === "import" ? "JSON" : "JSON exporte"}</span>
                <textarea
                  className="json-textarea"
                  value={jsonValue}
                  onChange={(event) => setJsonValue(event.target.value)}
                  placeholder={jsonModalMode === "import" ? jsonImportExample : "[]"}
                  readOnly={jsonModalMode === "export"}
                  spellCheck={false}
                />
              </label>

              <div className="editor-actions">
                {jsonModalMode === "import" ? (
                  <button className="primary-button" type="button" onClick={handleImportJson} disabled={busy}>
                    Importer
                  </button>
                ) : (
                  <button className="primary-button" type="button" onClick={handleCopyExportJson}>
                    Copier le JSON
                  </button>
                )}
                <button className="secondary-button json-close-action" type="button" onClick={closeJsonModal}>
                  Fermer
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
      </div>

      <DragOverlay zIndex={2000} dropAnimation={null}>
        {draggedApp ? (
          <DragOverlayTile
            app={draggedApp}
            compact={sidebarMode === "compact"}
            themeMode={themeMode}
            dashboardIconsMetadata={dashboardIconsMetadata}
            dragOutProgress={dragOutProgress}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
