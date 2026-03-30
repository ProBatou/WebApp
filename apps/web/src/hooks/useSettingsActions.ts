import { useCallback } from "react";
import { apiFetch } from "../lib/api";
import type { GroupEntry, UserPreferences, WebAppEntry } from "../types";

type SettingsActionsOptions = {
  apps: WebAppEntry[];
  groups: GroupEntry[];
  selectedAppId: number | null;
  pushToast: (message: string) => void;
  setApps: (apps: WebAppEntry[]) => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string | null) => void;
  setContextMenu: (value: null) => void;
  selectApp: (appId: number | null) => void;
  createGroup: (name: string) => Promise<GroupEntry>;
  updateGroup: (groupId: number, name: string) => Promise<GroupEntry>;
  reorderGroups: (groupIds: number[]) => Promise<GroupEntry[]>;
  deleteGroup: (groupId: number) => Promise<GroupEntry[]>;
  reloadApps: (preferSelectedId?: number | null) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export function useSettingsActions({
  apps,
  groups,
  selectedAppId,
  pushToast,
  setApps,
  setBusy,
  setError,
  setContextMenu,
  selectApp,
  createGroup,
  updateGroup,
  reorderGroups,
  deleteGroup,
  reloadApps,
  updatePreferences,
  t,
}: SettingsActionsOptions) {
  const handleToggleDefaultApp = useCallback(async (app: WebAppEntry) => {
    try {
      setBusy(true);
      setError(null);

      const result = await apiFetch<{ items: WebAppEntry[] }>(
        `/api/apps/${app.id}/default`,
        {
          method: app.is_default ? "DELETE" : "POST",
        }
      );

      setApps(result.items);
      updatePreferences({ defaultAppId: app.is_default ? null : app.id });

      if (!app.is_default) {
        selectApp(app.id);
      }

      pushToast(app.is_default ? "toast.defaultRemoved" : t("toast.defaultSet", { name: app.name }));
      setContextMenu(null);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "errors.update");
    } finally {
      setBusy(false);
    }
  }, [pushToast, selectApp, setApps, setBusy, setContextMenu, setError, t, updatePreferences]);

  const syncDefaultAppSelection = useCallback(async (nextDefaultAppId: number | null) => {
    const currentDefaultApp = apps.find((item) => item.is_default) ?? null;

    if (nextDefaultAppId === currentDefaultApp?.id) {
      return;
    }

    try {
      setBusy(true);
      setError(null);

      if (nextDefaultAppId == null) {
        if (!currentDefaultApp) {
          return;
        }

        const result = await apiFetch<{ items: WebAppEntry[] }>(`/api/apps/${currentDefaultApp.id}/default`, {
          method: "DELETE",
        });
        setApps(result.items);
        pushToast("toast.defaultRemoved");
        return;
      }

      const result = await apiFetch<{ items: WebAppEntry[] }>(`/api/apps/${nextDefaultAppId}/default`, {
        method: "POST",
      });
      setApps(result.items);
      const nextDefaultApp = apps.find((item) => item.id === nextDefaultAppId);
      pushToast(nextDefaultApp ? t("toast.defaultSet", { name: nextDefaultApp.name }) : "toast.defaultSet");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "errors.update");
    } finally {
      setBusy(false);
    }
  }, [apps, pushToast, setApps, setBusy, setError, t]);

  const handleUpdatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    updatePreferences(patch);

    if (Object.prototype.hasOwnProperty.call(patch, "defaultAppId")) {
      void syncDefaultAppSelection(patch.defaultAppId ?? null);
    }
  }, [syncDefaultAppSelection, updatePreferences]);

  const handleCreateGroup = useCallback(async (name: string) => {
    const group = await createGroup(name);
    pushToast(t("toast.groupAdded", { name: group.name }));
  }, [createGroup, pushToast, t]);

  const handleRenameGroup = useCallback(async (groupId: number, name: string) => {
    const group = await updateGroup(groupId, name);
    pushToast(t("toast.groupRenamed", { name: group.name }));
  }, [pushToast, t, updateGroup]);

  const handleDeleteGroup = useCallback(async (groupId: number) => {
    const group = groups.find((item) => item.id === groupId);
    await deleteGroup(groupId);
    await reloadApps(selectedAppId);
    pushToast(group ? t("toast.groupDeleted", { name: group.name }) : "toast.groupDeletedFallback");
  }, [deleteGroup, groups, pushToast, reloadApps, selectedAppId, t]);

  const handleMoveGroup = useCallback(async (groupId: number, direction: "up" | "down") => {
    const currentIndex = groups.findIndex((group) => group.id === groupId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) {
      return;
    }

    const nextGroups = [...groups];
    const [movedGroup] = nextGroups.splice(currentIndex, 1);
    nextGroups.splice(targetIndex, 0, movedGroup);
    await reorderGroups(nextGroups.map((group) => group.id));
  }, [groups, reorderGroups]);

  const handleReorderGroups = useCallback(async (groupIds: number[]) => {
    await reorderGroups(groupIds);
  }, [reorderGroups]);

  return {
    handleToggleDefaultApp,
    handleUpdatePreferences,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleMoveGroup,
    handleReorderGroups,
  };
}
