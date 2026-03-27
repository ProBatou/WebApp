import { useEffect, useState } from "react";
import {
  getDashboardIconAssetUrls,
  getDashboardIconBaseSlug,
  getDashboardIconPreviewVariants,
  getFallbackIconLabel,
  getFaviconCandidates,
  isDashboardIconSlug,
  resolveDashboardIcon,
} from "../lib/app-utils";
import type { DashboardIconsMetadataMap, IconVariantMode, ThemeMode } from "../types";

export function AppIcon({
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

export function DashboardIconPreviewImage({
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

export function getPreviewVariants(icon: string, dashboardIconsMetadata: DashboardIconsMetadataMap) {
  return getDashboardIconPreviewVariants(icon, dashboardIconsMetadata);
}
