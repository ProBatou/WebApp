import { useCallback, useState } from "react";
import { apiFetch } from "../lib/api";
import type { GroupEntry, GroupsResponse } from "../types";

export function useGroups({
  setBusy,
  setError,
}: {
  setBusy: (busy: boolean) => void;
  setError: (value: string | null) => void;
}) {
  const [groups, setGroups] = useState<GroupEntry[]>([]);

  const reloadGroups = useCallback(async () => {
    const result = await apiFetch<GroupsResponse>("/api/groups", { method: "GET" });
    setGroups(result.items);
    return result.items;
  }, []);

  const createGroup = useCallback(async (name: string) => {
    try {
      setBusy(true);
      setError(null);

      const result = await apiFetch<GroupsResponse & { item: GroupEntry }>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      setGroups(result.items);
      return result.item;
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "errors.group");
      throw groupError;
    } finally {
      setBusy(false);
    }
  }, [setBusy, setError]);

  const updateGroup = useCallback(async (groupId: number, name: string) => {
    try {
      setBusy(true);
      setError(null);

      const result = await apiFetch<GroupsResponse & { item: GroupEntry }>(`/api/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });

      setGroups(result.items);
      return result.item;
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "errors.group");
      throw groupError;
    } finally {
      setBusy(false);
    }
  }, [setBusy, setError]);

  const reorderGroups = useCallback(async (groupIds: number[]) => {
    try {
      setBusy(true);
      setError(null);

      const result = await apiFetch<GroupsResponse>("/api/groups/reorder", {
        method: "POST",
        body: JSON.stringify({
          items: groupIds.map((id) => ({ id })),
        }),
      });

      setGroups(result.items);
      return result.items;
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "errors.group");
      throw groupError;
    } finally {
      setBusy(false);
    }
  }, [setBusy, setError]);

  const deleteGroup = useCallback(async (groupId: number) => {
    try {
      setBusy(true);
      setError(null);

      const result = await apiFetch<GroupsResponse>(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      setGroups(result.items);
      return result.items;
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "errors.group");
      throw groupError;
    } finally {
      setBusy(false);
    }
  }, [setBusy, setError]);

  const resetGroups = useCallback(() => {
    setGroups([]);
  }, []);

  return {
    groups,
    setGroups,
    reloadGroups,
    createGroup,
    updateGroup,
    reorderGroups,
    deleteGroup,
    resetGroups,
  };
}
