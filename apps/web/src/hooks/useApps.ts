import { startTransition, useCallback, useEffect, useState } from "react";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { apiFetch } from "../lib/api";
import type { AppsResponse, WebAppEntry } from "../types";

const recentAppsStorageKey = "webapp-v2-recent-app-ids";

function readRecentAppIds() {
  const rawValue = window.localStorage.getItem(recentAppsStorageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsedValue) ? parsedValue.filter((value): value is number => Number.isInteger(value) && value > 0).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function useApps({
  setBusy,
  setError,
}: {
  setBusy: (busy: boolean) => void;
  setError: (value: string | null) => void;
}) {
  const [apps, setApps] = useState<WebAppEntry[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [recentAppIds, setRecentAppIds] = useState<number[]>(() => readRecentAppIds());

  useEffect(() => {
    if (apps.length === 0) {
      return;
    }

    setRecentAppIds((current) => {
      const nextIds = current.filter((appId) => apps.some((item) => item.id === appId));
      if (nextIds.length === current.length) {
        return current;
      }

      window.localStorage.setItem(recentAppsStorageKey, JSON.stringify(nextIds));
      return nextIds;
    });
  }, [apps]);

  const reloadApps = useCallback(async (preferSelectedId?: number | null) => {
    const appsResult = await apiFetch<AppsResponse>("/api/apps", { method: "GET" });
    setApps(appsResult.items);

    const nextId = preferSelectedId && appsResult.items.some((item) => item.id === preferSelectedId)
      ? preferSelectedId
      : appsResult.items.find((item) => item.is_default)?.id ?? appsResult.items[0]?.id ?? null;

    startTransition(() => {
      setSelectedAppId(nextId);
    });
  }, []);

  const deleteApp = useCallback(async (appId: number) => {
    try {
      setBusy(true);
      await apiFetch<null>(`/api/apps/${appId}`, { method: "DELETE" });
      await reloadApps(selectedAppId === appId ? null : selectedAppId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erreur de suppression.");
      throw deleteError;
    } finally {
      setBusy(false);
    }
  }, [reloadApps, selectedAppId, setBusy, setError]);

  const handleReorder = useCallback(async (event: DragEndEvent, isDroppedOutsideSidebar: (event: DragEndEvent) => boolean) => {
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
  }, [apps, deleteApp, reloadApps, selectedAppId, setError]);

  const resetAppsState = useCallback(() => {
    setApps([]);
    setSelectedAppId(null);
  }, []);

  const selectApp = useCallback((appId: number | null) => {
    startTransition(() => {
      setSelectedAppId(appId);
    });

    if (appId === null) {
      return;
    }

    setRecentAppIds((current) => {
      const nextIds = [appId, ...current.filter((id) => id !== appId)].slice(0, 5);
      window.localStorage.setItem(recentAppsStorageKey, JSON.stringify(nextIds));
      return nextIds;
    });
  }, []);

  const recentApps = recentAppIds
    .map((appId) => apps.find((item) => item.id === appId) ?? null)
    .filter((app): app is WebAppEntry => app !== null);

  return {
    apps,
    setApps,
    selectedAppId,
    setSelectedAppId,
    selectApp,
    reloadApps,
    deleteApp,
    handleReorder,
    resetAppsState,
    recentApps,
  };
}
