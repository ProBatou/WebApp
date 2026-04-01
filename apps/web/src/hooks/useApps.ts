import { startTransition, useCallback, useState } from "react";
import { type DragEndEvent } from "@dnd-kit/core";
import { apiFetch } from "../lib/api";
import type { AppsResponse, GroupEntry, WebAppEntry } from "../types";

const ungroupedDropId = "group:none";

function getDropGroupId(dropId: string) {
  if (dropId === ungroupedDropId) {
    return null;
  }

  const prefix = "group:";
  if (!dropId.startsWith(prefix)) {
    return null;
  }

  const value = Number(dropId.slice(prefix.length));
  return Number.isInteger(value) ? value : null;
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
      setError(deleteError instanceof Error ? deleteError.message : "errors.delete");
      throw deleteError;
    } finally {
      setBusy(false);
    }
  }, [reloadApps, selectedAppId, setBusy, setError]);

  const handleReorder = useCallback(async (
    event: DragEndEvent,
    isDroppedOutsideSidebar: (event: DragEndEvent) => boolean,
    groups: GroupEntry[]
  ) => {
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

    const activeApp = apps.find((item) => item.id === activeId);
    if (!activeApp) {
      return;
    }

    const overId = typeof over.id === "number" ? over.id : String(over.id);
    const targetGroupId = typeof overId === "string"
      ? getDropGroupId(overId)
      : apps.find((item) => item.id === Number(overId))?.group_id ?? activeApp.group_id;

    const oldIndex = apps.findIndex((item) => item.id === activeId);
    if (oldIndex < 0) {
      return;
    }

    const appsWithoutActive = apps.filter((item) => item.id !== activeId);
    let insertIndex = appsWithoutActive.findIndex((item) => item.id === Number(over.id));
    const overIndex = typeof over.id === "number" ? apps.findIndex((item) => item.id === Number(over.id)) : -1;

    if (insertIndex < 0) {
      const lastIndexInTargetGroup = appsWithoutActive.reduce((lastIndex, item, index) => {
        return item.group_id === targetGroupId ? index : lastIndex;
      }, -1);

      insertIndex = lastIndexInTargetGroup >= 0 ? lastIndexInTargetGroup + 1 : appsWithoutActive.length;

      const targetGroupPosition = targetGroupId === null ? groups.length : groups.findIndex((group) => group.id === targetGroupId);
      if (lastIndexInTargetGroup < 0 && targetGroupPosition >= 0) {
        const nextGroup = groups.slice(targetGroupPosition + (targetGroupId === null ? 0 : 1)).find((group) =>
          appsWithoutActive.some((item) => item.group_id === group.id)
        );
        if (nextGroup) {
          const nextGroupIndex = appsWithoutActive.findIndex((item) => item.group_id === nextGroup.id);
          insertIndex = nextGroupIndex >= 0 ? nextGroupIndex : insertIndex;
        }
      }
    } else if (overIndex > oldIndex) {
      // Match dnd-kit sortable behavior: when dragging downward over an item,
      // the active card should land after that item instead of before it.
      insertIndex += 1;
    }

    const nextActiveApp = {
      ...activeApp,
      group_id: targetGroupId,
    };
    const reordered = [
      ...appsWithoutActive.slice(0, Math.min(insertIndex, appsWithoutActive.length)),
      nextActiveApp,
      ...appsWithoutActive.slice(Math.min(insertIndex, appsWithoutActive.length)),
    ].map((item, index) => {
      if (item.id !== activeId) {
        return {
          ...item,
          sort_order: index + 1,
        };
      }

      return {
        ...nextActiveApp,
        sort_order: index + 1,
      };
    });

    setApps(reordered);

    try {
      await apiFetch<AppsResponse>("/api/apps/reorder", {
        method: "POST",
        body: JSON.stringify({
          items: reordered.map((item) => ({
            id: item.id,
            groupId: item.group_id,
          })),
        }),
      });
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "errors.reorder");
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
  }, []);

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
  };
}
