import { useEffect, useMemo, useState } from "react";
import {
  dashboardIconsMetadataUrl,
  sortDashboardIconsBySearchQuery,
  getDashboardIconAssetCandidates,
  getDashboardIconAssetUrls,
  isDashboardIconSlug,
  normalizeIconSearchValue,
} from "../lib/app-utils";
import { preloadDashboardAssetUrls } from "../lib/dashboard-icon-assets";
import type { DashboardIconsMetadataMap, WebAppEntry } from "../types";

const iconPickerResultLimit = 10;
const iconPreloadLimit = 24;

export function useDashboardIcons({
  editorOpen,
  apps,
  editorIcon,
  iconQuery,
}: {
  editorOpen: boolean;
  apps: WebAppEntry[];
  editorIcon: string;
  iconQuery: string;
}) {
  const [dashboardIconsMetadata, setDashboardIconsMetadata] = useState<DashboardIconsMetadataMap>({});
  const [dashboardIcons, setDashboardIcons] = useState<string[]>([]);
  const [dashboardIconsLoading, setDashboardIconsLoading] = useState(false);
  const [dashboardIconsError, setDashboardIconsError] = useState<string | null>(null);

  const hasDashboardIconsInUse = useMemo(
    () => apps.some((app) => isDashboardIconSlug(app.icon)) || isDashboardIconSlug(editorIcon),
    [apps, editorIcon]
  );
  const normalizedIconQuery = normalizeIconSearchValue(iconQuery);
  const filteredDashboardIcons = useMemo(() => {
    const normalizedQueryTerms = normalizedIconQuery.split("-").filter(Boolean);
    if (normalizedQueryTerms.length === 0) {
      return [];
    }

    return sortDashboardIconsBySearchQuery(
      normalizedIconQuery,
      dashboardIcons
      .filter((icon) => {
        const normalizedIcon = normalizeIconSearchValue(icon);
        return normalizedQueryTerms.every((term) => normalizedIcon.includes(term));
      })
    ).slice(0, iconPickerResultLimit);
  }, [dashboardIcons, normalizedIconQuery]);

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
          throw new Error("errors.load");
        }

        const metadata = (await response.json()) as DashboardIconsMetadataMap;
        setDashboardIconsMetadata(metadata);
        setDashboardIcons(Object.keys(metadata).sort((left, right) => left.localeCompare(right)));
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setDashboardIconsError(loadError instanceof Error ? loadError.message : "errors.load");
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
    const assetGroupsToPreload = new Map<string, string[]>();
    const addAssetGroup = (icon: string) => {
      const assetUrls = getDashboardIconAssetUrls(icon);
      assetGroupsToPreload.set(assetUrls.join("\u0000"), assetUrls);
    };

    apps.forEach((app) => {
      if (isDashboardIconSlug(app.icon)) {
        getDashboardIconAssetCandidates(app.icon, dashboardIconsMetadata).forEach(addAssetGroup);
      }
    });

    if (isDashboardIconSlug(editorIcon)) {
      getDashboardIconAssetCandidates(editorIcon, dashboardIconsMetadata).forEach(addAssetGroup);
    }

    filteredDashboardIcons.slice(0, iconPreloadLimit).forEach((icon) => {
      getDashboardIconAssetCandidates(icon, dashboardIconsMetadata).forEach(addAssetGroup);
    });

    assetGroupsToPreload.forEach((assetUrls) => {
      void preloadDashboardAssetUrls(assetUrls);
    });
  }, [apps, dashboardIconsMetadata, editorIcon, filteredDashboardIcons]);

  return {
    dashboardIconsMetadata,
    dashboardIcons,
    dashboardIconsLoading,
    dashboardIconsError,
    filteredDashboardIcons,
  };
}
