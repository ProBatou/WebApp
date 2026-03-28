import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { emptyEditorState, isDashboardIconSlug } from "../lib/app-utils";
import type { AppEditorState, EditorMode, WebAppEntry } from "../types";

export function useEditor({
  reloadApps,
  deleteApp,
  setBusy,
  setError,
  onAfterDelete,
}: {
  reloadApps: (preferSelectedId?: number | null) => Promise<void>;
  deleteApp: (appId: number) => Promise<void>;
  setBusy: (busy: boolean) => void;
  setError: (value: string | null) => void;
  onAfterDelete: () => void;
}) {
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<AppEditorState>(emptyEditorState);
  const [iconQuery, setIconQuery] = useState("");
  const [debouncedIconQuery, setDebouncedIconQuery] = useState("");
  const [iconSelectionLocked, setIconSelectionLocked] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedIconQuery(iconQuery);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [iconQuery]);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const openCreateEditor = useCallback(() => {
    setEditorMode("create");
    setEditingId(null);
    setEditorState(emptyEditorState);
    setIconQuery("");
    setDebouncedIconQuery("");
    setIconSelectionLocked(false);
    setEditorOpen(true);
  }, []);

  const openEditEditor = useCallback((app: WebAppEntry) => {
    setEditorMode("edit");
    setEditingId(app.id);
    setEditorState({
      name: app.name,
      url: app.url,
      icon: app.icon,
      iconVariantMode: app.icon_variant_mode,
      iconVariantInverted: app.icon_variant_inverted,
      accent: app.accent,
      openMode: app.open_mode,
      isShared: app.is_shared,
      groupId: app.group_id,
    });
    const initialIconQuery = isDashboardIconSlug(app.icon) ? app.icon : "";
    setIconQuery(initialIconQuery);
    setDebouncedIconQuery(initialIconQuery);
    setIconSelectionLocked(isDashboardIconSlug(app.icon));
    setEditorOpen(true);
  }, []);

  const handleSaveApp = useCallback(async (event: FormEvent<HTMLFormElement>, resolvedIcon: string) => {
    event.preventDefault();

    try {
      setBusy(true);
      setError(null);

      const endpoint = editorMode === "create" ? "/api/apps" : `/api/apps/${editingId}`;
      const method = editorMode === "create" ? "POST" : "PUT";
      const result = await apiFetch<{ item: WebAppEntry }>(endpoint, {
        method,
        body: JSON.stringify({
          ...editorState,
          icon: resolvedIcon,
          iconVariantMode: editorState.iconVariantMode,
          iconVariantInverted: editorState.iconVariantInverted,
        }),
      });

      await reloadApps(result.item.id);
      setEditorOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "errors.save");
    } finally {
      setBusy(false);
    }
  }, [editingId, editorMode, editorState, reloadApps, setBusy, setError]);

  const handleDeleteApp = useCallback(async () => {
    if (!editingId) {
      return;
    }

    await deleteApp(editingId);
    setEditingId(null);
    setEditorOpen(false);
    onAfterDelete();
  }, [deleteApp, editingId, onAfterDelete]);

  return {
    editorMode,
    editorOpen,
    editingId,
    editorState,
    setEditorState,
    iconQuery,
    setIconQuery,
    debouncedIconQuery,
    iconSelectionLocked,
    setIconSelectionLocked,
    closeEditor,
    openCreateEditor,
    openEditEditor,
    handleSaveApp,
    handleDeleteApp,
    setDebouncedIconQuery,
  };
}
