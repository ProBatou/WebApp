import { memo, useEffect, useState } from "react";
import {
  getDashboardIconAssetUrls,
  getDashboardIconBaseSlug,
  getDashboardIconPreviewVariants,
  getFallbackIconLabel,
  getFaviconCandidates,
  isCustomIconUrl,
  isDashboardIconSlug,
  resolveDashboardIcon,
} from "../lib/app-utils";
import {
  getDashboardAssetCacheKey,
  getInitialDashboardAssetIndex,
  rememberDashboardAssetFailure,
  rememberDashboardAssetSuccess,
} from "../lib/dashboard-icon-assets";
import type { DashboardIconsMetadataMap, IconVariantMode, ThemeMode } from "../types";

export const AppIcon = memo(function AppIcon({
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
  const [customIconFailed, setCustomIconFailed] = useState(false);
  const [faviconIndex, setFaviconIndex] = useState(0);
  const customIconUrl = isCustomIconUrl(icon) && !customIconFailed ? icon.trim() : "";
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
  const dashboardAssetCacheKey = getDashboardAssetCacheKey(dashboardAssetUrls);
  const [dashboardAssetIndex, setDashboardAssetIndex] = useState(() => getInitialDashboardAssetIndex(dashboardAssetUrls));
  const dashboardIconUrl = dashboardAssetUrls[dashboardAssetIndex] ?? "";
  const dashboardIcon = Boolean(dashboardIconUrl);
  const faviconCandidates = getFaviconCandidates(url);
  const faviconUrl = !dashboardIcon && !customIconUrl ? (faviconCandidates[faviconIndex] ?? "") : "";
  const fallbackLabel = getFallbackIconLabel(name, icon);

  useEffect(() => {
    setDashboardAssetIndex(getInitialDashboardAssetIndex(dashboardAssetUrls));
    setCustomIconFailed(false);
    setFaviconIndex(0);
  }, [dashboardAssetCacheKey, icon, url]);

  const imageSurface = Boolean(customIconUrl) || dashboardIcon || Boolean(faviconUrl);
  const iconClassName = imageSurface ? "app-icon app-icon-surface" : "app-icon";
  const iconStyle = imageSurface ? undefined : { backgroundColor: accent };

  return (
    <span className={iconClassName} style={iconStyle} title={dashboardIcon ? dashboardIconUrl : customIconUrl || faviconUrl || undefined}>
      {dashboardIcon ? (
        <img
          key={dashboardIconUrl}
          className="app-icon-image"
          src={dashboardIconUrl}
          alt=""
          loading="lazy"
          onLoad={() => {
            rememberDashboardAssetSuccess(dashboardAssetUrls, dashboardAssetIndex);
          }}
          onError={() => {
            rememberDashboardAssetFailure(dashboardIconUrl);
            setDashboardAssetIndex((current) => current + 1);
          }}
        />
      ) : customIconUrl ? (
        <img
          key={customIconUrl}
          className="app-icon-image"
          src={customIconUrl}
          alt=""
          loading="lazy"
          onError={() => {
            setCustomIconFailed(true);
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
});

export const DashboardIconPreviewImage = memo(function DashboardIconPreviewImage({
  icon,
  fallbackIcon,
  className,
}: {
  icon: string;
  fallbackIcon: string;
  className?: string;
}) {
  const assetUrls = Array.from(new Set([...getDashboardIconAssetUrls(icon), ...getDashboardIconAssetUrls(fallbackIcon)]));
  const assetCacheKey = getDashboardAssetCacheKey(assetUrls);
  const [assetIndex, setAssetIndex] = useState(() => getInitialDashboardAssetIndex(assetUrls));
  const currentAssetUrl = assetUrls[assetIndex] ?? "";

  useEffect(() => {
    setAssetIndex(getInitialDashboardAssetIndex(assetUrls));
  }, [assetCacheKey]);

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
      onLoad={() => {
        rememberDashboardAssetSuccess(assetUrls, assetIndex);
      }}
      onError={() => {
        rememberDashboardAssetFailure(currentAssetUrl);
        setAssetIndex((current) => current + 1);
      }}
    />
  );
});

export function getPreviewVariants(icon: string, dashboardIconsMetadata: DashboardIconsMetadataMap) {
  return getDashboardIconPreviewVariants(icon, dashboardIconsMetadata);
}
