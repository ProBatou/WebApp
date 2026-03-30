import { useEffect, useMemo, useState } from "react";
import {
  dashboardIconsMetadataUrl,
  getDashboardIconAssetCandidates,
  getDashboardIconUrl,
  isDashboardIconSlug,
  normalizeIconSearchValue,
} from "../lib/app-utils";
import type { DashboardIconsMetadataMap, WebAppEntry } from "../types";

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
  const normalizedQueryTerms = normalizedIconQuery.split("-").filter(Boolean);
  const filteredDashboardIcons = normalizedQueryTerms.length
    ? dashboardIcons
        .filter((icon) => {
          const normalizedIcon = normalizeIconSearchValue(icon);
          return normalizedQueryTerms.every((term) => normalizedIcon.includes(term));
        })
        .slice(0, 8)
    : [];

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
    const iconsToPreload = new Set<string>();

    apps.forEach((app) => {
      if (isDashboardIconSlug(app.icon)) {
        getDashboardIconAssetCandidates(app.icon, dashboardIconsMetadata).forEach((icon) => iconsToPreload.add(icon));
      }
    });

    if (isDashboardIconSlug(editorIcon)) {
      getDashboardIconAssetCandidates(editorIcon, dashboardIconsMetadata).forEach((icon) => iconsToPreload.add(icon));
    }

    filteredDashboardIcons.forEach((icon) => {
      getDashboardIconAssetCandidates(icon, dashboardIconsMetadata).forEach((candidate) => iconsToPreload.add(candidate));
    });

    iconsToPreload.forEach((icon) => {
      const image = new Image();
      image.decoding = "async";
      image.src = getDashboardIconUrl(icon);
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
