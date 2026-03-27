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
export const dashboardIconsCdnBaseUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";
export const jsonImportExample = `[
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

export const emptyEditorState: AppEditorState = {
  name: "",
  description: "",
  url: "https://",
  icon: "",
  iconVariantMode: "auto",
  iconVariantInverted: false,
  accent: "#cf5c36",
  openMode: "iframe",
};

export function isDashboardIconSlug(value: string) {
  return /^[a-z0-9-]+$/.test(value.trim());
}

export function getDashboardIconUrl(icon: string) {
  return `${dashboardIconsCdnBaseUrl}/${icon}.svg`;
}

export function getDashboardIconAssetUrls(icon: string) {
  return [
    `${dashboardIconsCdnBaseUrl}/${icon}.svg`,
    `${dashboardIconsCdnBaseUrl.replace(/\/svg$/, "/png")}/${icon}.png`,
  ];
}

export function getFaviconCandidates(url: string) {
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

export function getDashboardIconBaseSlug(icon: string) {
  return icon.endsWith("-light") ? icon.slice(0, -6) : icon;
}

export function getDashboardIconVariants(icon: string, metadataMap: DashboardIconsMetadataMap) {
  const baseIcon = getDashboardIconBaseSlug(icon);
  const metadata = metadataMap[icon] ?? metadataMap[baseIcon];

  return {
    baseIcon,
    lightBackgroundIcon: metadata?.colors?.dark ?? baseIcon,
    darkBackgroundIcon: metadata?.colors?.light ?? (baseIcon.endsWith("-light") ? baseIcon : `${baseIcon}-light`),
    hasVariants: Boolean(metadata?.colors?.light || metadata?.colors?.dark || icon.endsWith("-light")),
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
    })),
    null,
    2
  );
}

export function parseImportedApps(rawValue: string) {
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
    };
  });
}
