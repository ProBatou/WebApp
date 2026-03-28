import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { exportAppsToJson, parseImportedApps } from "../lib/app-utils";
import { apiFetch } from "../lib/api";
import { useTranslation } from "../lib/i18n";
import type { ImportAppsResponse, JsonImportMode, JsonModalMode, WebAppEntry } from "../types";

type UseJsonImportParams = {
  apps: WebAppEntry[];
  canManageApps: boolean;
  closeEditor: () => void;
  closeAuxiliaryModals: () => void;
  closeConfirm: () => void;
  openConfirm: (message: string, onConfirm: () => void) => void;
  pushToast: (message: string) => number;
  selectApp: (appId: number | null) => void;
  setApps: (items: WebAppEntry[]) => void;
  setBusy: (value: boolean) => void;
  setContextMenu: (value: null) => void;
  setError: (value: string | null) => void;
};

export function useJsonImport({
  apps,
  canManageApps,
  closeEditor,
  closeAuxiliaryModals,
  closeConfirm,
  openConfirm,
  pushToast,
  selectApp,
  setApps,
  setBusy,
  setContextMenu,
  setError,
}: UseJsonImportParams) {
  const { t } = useTranslation();
  const [jsonModalMode, setJsonModalMode] = useState<JsonModalMode>(null);
  const [jsonImportMode, setJsonImportMode] = useState<JsonImportMode>("merge");
  const [jsonValue, setJsonValue] = useState("");
  const [jsonModalError, setJsonModalError] = useState<string | null>(null);
  const [jsonModalInfo, setJsonModalInfo] = useState<string | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  const closeJsonModal = useCallback(() => {
    setJsonModalMode(null);
    setJsonModalError(null);
    setJsonModalInfo(null);
  }, []);

  const openJsonImport = useCallback(() => {
    if (!canManageApps) {
      return;
    }

    setContextMenu(null);
    closeEditor();
    closeAuxiliaryModals();
    setJsonImportMode("merge");
    setJsonValue("");
    setJsonModalError(null);
    setJsonModalInfo(null);
    setJsonModalMode("import");
  }, [canManageApps, closeAuxiliaryModals, closeEditor, setContextMenu]);

  const openJsonExport = useCallback(() => {
    if (!canManageApps) {
      return;
    }

    setContextMenu(null);
    closeEditor();
    closeAuxiliaryModals();
    setJsonModalError(null);
    setJsonModalInfo(null);
    setJsonValue(exportAppsToJson(apps));
    setJsonModalMode("export");
  }, [apps, canManageApps, closeAuxiliaryModals, closeEditor, setContextMenu]);

  const handleJsonFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const nextValue = await file.text();
      setJsonValue(nextValue);
      setJsonModalError(null);
      setJsonModalInfo(t("toast.fileLoaded", { name: file.name }));
    } catch {
      setJsonModalError("errors.readJson");
      setJsonModalInfo(null);
    } finally {
      event.target.value = "";
    }
  }, [t]);

  const handleCopyExportJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonValue);
      setJsonModalError(null);
      setJsonModalInfo("toast.jsonCopied");
      pushToast("toast.jsonCopiedClipboard");
    } catch {
      setJsonModalError("errors.copyJson");
      setJsonModalInfo(null);
    }
  }, [jsonValue, pushToast]);

  const executeImport = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      setJsonModalError(null);
      setJsonModalInfo(null);

      const importedItems = parseImportedApps(jsonValue);
      const result = await apiFetch<ImportAppsResponse>("/api/apps/import", {
        method: "POST",
        body: JSON.stringify({
          mode: jsonImportMode,
          items: importedItems,
        }),
      });

      setApps(result.items);
      const preferredId = result.importedIds.length > 0 ? result.importedIds[result.importedIds.length - 1] : result.items[0]?.id ?? null;
      selectApp(preferredId);
      closeJsonModal();
      pushToast(t("toast.importedApps", { count: result.importedIds.length, suffix: result.importedIds.length > 1 ? "s" : "" }));
    } catch (importError) {
      setJsonModalError(importError instanceof Error ? importError.message : "errors.import");
    } finally {
      setBusy(false);
    }
  }, [closeJsonModal, jsonImportMode, jsonValue, pushToast, selectApp, setApps, setBusy, setError, t]);

  const handleImportJson = useCallback(async () => {
    try {
      const importedItems = parseImportedApps(jsonValue);
      if (jsonImportMode === "replace" && apps.length > 0) {
        openConfirm(
          t("confirm.replaceImport", {
            existing: apps.length,
            existingSuffix: apps.length > 1 ? "s" : "",
            incoming: importedItems.length,
            incomingSuffix: importedItems.length > 1 ? "s" : "",
          }),
          () => {
            closeConfirm();
            void executeImport();
          }
        );
        return;
      }

      await executeImport();
    } catch (importError) {
      setJsonModalError(importError instanceof Error ? importError.message : "errors.import");
    }
  }, [apps.length, closeConfirm, executeImport, jsonImportMode, jsonValue, openConfirm, t]);

  const prepareExport = useCallback(() => {
    setJsonModalError(null);
    setJsonModalInfo(null);
    setJsonValue(exportAppsToJson(apps));
  }, [apps]);

  const resetImport = useCallback(() => {
    setJsonImportMode("merge");
    setJsonValue("");
    setJsonModalError(null);
    setJsonModalInfo(null);
  }, []);

  return {
    jsonModalMode,
    jsonImportMode,
    jsonValue,
    jsonModalError,
    jsonModalInfo,
    jsonFileInputRef,
    setJsonImportMode,
    setJsonValue,
    closeJsonModal,
    openJsonImport,
    openJsonExport,
    handleJsonFileChange,
    handleCopyExportJson,
    executeImport,
    handleImportJson,
    prepareExport,
    resetImport,
  };
}
