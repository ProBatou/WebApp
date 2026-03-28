import type {
  AppEditorState,
  AppMode,
  DashboardIconResolution,
  DashboardIconsMetadataMap,
  IconVariantMode,
  JsonTransferItem,
  ThemeMode,
  WebAppEntry,
} from "../types";

export const themeStorageKey = "webapp-v2-theme";
export const dashboardIconsMetadataUrl = "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json";
export const dashboardIconsProxyBaseUrl = "/api/icons/proxy";
export const dashboardIconsCdnBaseUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";
export const jsonImportExample = `[
  {
    "name": "Plex",
    "description": "Media server",
    "url": "https://plex.example.com",
    "icon": "plex",
    "iconVariantMode": "auto",
    "iconVariantInverted": false,
    "accent": "#cf5c36",
    "openMode": "iframe",
    "isShared": true,
    "groupId": null
  }
]`;

export const emptyEditorState: AppEditorState = {
  name: "",
  description: "",
  url: "https://",
  icon: "",
  iconVariantMode: "auto",
  iconVariantInverted: false,
  accent: "#cf5c36",
  openMode: "iframe",
  isShared: true,
  groupId: null,
};

export function isDashboardIconSlug(value: string) {
  return /^[a-z0-9-]+$/.test(value.trim());
}

export function getDashboardIconUrl(icon: string) {
  return `${dashboardIconsProxyBaseUrl}/${icon}`;
}

export function getDashboardIconAssetUrls(icon: string) {
  return [
    `${dashboardIconsProxyBaseUrl}/${icon}`,
    `${dashboardIconsCdnBaseUrl}/${icon}.svg`,
    `${dashboardIconsCdnBaseUrl.replace(/\/svg$/, "/png")}/${icon}.png`,
  ];
}

export function getFaviconCandidates(url: string) {
  try {
    const parsedUrl = parseHttpUrl(url);
    return [
      new URL("/favicon.ico", parsedUrl.origin).toString(),
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=128`,
    ];
  } catch {
    return [];
  }
}

export function getDashboardIconBaseSlug(icon: string) {
  return icon.endsWith("-light") ? icon.slice(0, -6) : icon;
}

export function getDashboardIconVariants(icon: string, metadataMap: DashboardIconsMetadataMap) {
  const baseIcon = getDashboardIconBaseSlug(icon);
  const metadata = metadataMap[icon] ?? metadataMap[baseIcon];
  const isExplicitLightVariant = icon.endsWith("-light") && icon !== baseIcon;

  return {
    baseIcon,
    lightBackgroundIcon: metadata?.colors?.dark ?? baseIcon,
    darkBackgroundIcon: metadata?.colors?.light ?? (isExplicitLightVariant ? icon : baseIcon),
    hasVariants: Boolean(metadata?.colors?.light || metadata?.colors?.dark || isExplicitLightVariant),
  };
}

export function resolveDashboardIcon(
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

export function getDashboardIconAssetCandidates(icon: string, metadataMap: DashboardIconsMetadataMap) {
  const variants = getDashboardIconVariants(icon, metadataMap);

  return Array.from(
    new Set(
      [variants.baseIcon, variants.darkBackgroundIcon, variants.lightBackgroundIcon].filter((value): value is string => Boolean(value))
    )
  );
}

export function getDashboardIconPreviewVariants(icon: string, metadataMap: DashboardIconsMetadataMap) {
  return getDashboardIconVariants(icon, metadataMap);
}

export function getEffectivePreviewVariants(
  previewVariants: ReturnType<typeof getDashboardIconPreviewVariants>,
  iconVariantInverted: boolean
) {
  if (!iconVariantInverted) {
    return previewVariants;
  }

  return {
    ...previewVariants,
    lightBackgroundIcon: previewVariants.darkBackgroundIcon,
    darkBackgroundIcon: previewVariants.lightBackgroundIcon,
  };
}

export function getFallbackIconLabel(name: string, existingIcon?: string) {
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

export function formatDashboardIconLabel(icon: string) {
  return icon
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeIconSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findBestDashboardIconMatch(name: string, icons: string[]) {
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

export function getSuggestedDashboardIcon(searchValue: string, icons: string[]) {
  const normalizedSearch = normalizeIconSearchValue(searchValue);
  if (!normalizedSearch) {
    return "";
  }

  return findBestDashboardIconMatch(searchValue, icons) || normalizedSearch;
}

export function isAppMode(value: unknown): value is AppMode {
  return value === "iframe" || value === "external";
}

export function isIconVariantMode(value: unknown): value is IconVariantMode {
  return value === "auto" || value === "base";
}

export function isAccentColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

export function parseHttpUrl(url: string) {
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("URL invalide.");
  }

  return parsedUrl;
}

export function exportAppsToJson(apps: WebAppEntry[]) {
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
      isShared: app.is_shared,
      groupId: app.group_id,
    })),
    null,
    2
  );
}

export function parseImportedApps(rawValue: string) {
  const trimmed = rawValue.trim();
  let items: unknown[] | null = null;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawValue);
    } catch {
      throw new Error("JSON invalide.");
    }

    items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { apps?: unknown }).apps)
          ? (parsed as { apps: unknown[] }).apps
          : null;

    // Homarr-like exports can wrap entries in sections.
    if (!items && parsed && typeof parsed === "object" && Array.isArray((parsed as { sections?: unknown }).sections)) {
      const sections = (parsed as { sections: unknown[] }).sections;
      const flattened = sections.flatMap((section) => {
        if (!section || typeof section !== "object") {
          return [];
        }

        const nextSection = section as { apps?: unknown; items?: unknown };
        if (Array.isArray(nextSection.apps)) {
          return nextSection.apps;
        }

        if (Array.isArray(nextSection.items)) {
          return nextSection.items;
        }

        return [];
      });

      items = flattened.length > 0 ? flattened : null;
    }

    if (!items) {
      throw new Error("Format JSON non supporte.");
    }
  } else {
    items = parseHomepageYaml(rawValue);
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
    const isShared = typeof item.isShared === "boolean" ? item.isShared : true;
    const groupId = typeof item.groupId === "number" && Number.isInteger(item.groupId) && item.groupId > 0 ? item.groupId : null;

    if (name.length < 2) {
      throw new Error(`Entree ${index + 1}: nom invalide.`);
    }

    if (!url) {
      throw new Error(`Entree ${index + 1}: URL manquante.`);
    }

    try {
      parseHttpUrl(url);
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
      isShared,
      groupId,
    };
  });
}

function parseHomepageYaml(rawValue: string) {
  const lines = rawValue.split(/\r?\n/);
  const entries: JsonTransferItem[] = [];
  let currentEntry: JsonTransferItem | null = null;

  const flushCurrentEntry = () => {
    if (!currentEntry) {
      return;
    }

    entries.push(currentEntry);
    currentEntry = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const indent = line.search(/\S|$/);

    // Homepage service entry: "  - Service Name:"
    const serviceMatch = trimmed.match(/^-\s+(.+):\s*$/);
    if (serviceMatch && indent >= 2) {
      flushCurrentEntry();
      currentEntry = {
        name: serviceMatch[1].trim(),
      };
      return;
    }

    if (!currentEntry || indent < 4) {
      return;
    }

    const fieldMatch = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.+)\s*$/);
    if (!fieldMatch) {
      return;
    }

    const key = fieldMatch[1].toLowerCase();
    const value = fieldMatch[2].replace(/^['"]|['"]$/g, "");

    if (key === "href" || key === "url") {
      currentEntry.url = value;
    }

    if (key === "icon") {
      currentEntry.icon = value;
    }
  });

  flushCurrentEntry();
  return entries;
}
