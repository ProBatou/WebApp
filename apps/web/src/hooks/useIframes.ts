import { useCallback, useEffect, useState } from "react";
import type { WebAppEntry } from "../types";

const maxMountedIframes = 5;

export function useIframes({
  apps,
  selectedApp,
}: {
  apps: WebAppEntry[];
  selectedApp: WebAppEntry | null;
}) {
  const [mountedIframeIds, setMountedIframeIds] = useState<number[]>([]);
  const [iframeReloadTokens, setIframeReloadTokens] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!selectedApp || selectedApp.open_mode !== "iframe") {
      return;
    }

    setMountedIframeIds((current) => {
      const nextIds = current.filter((iframeId) => iframeId !== selectedApp.id);
      return [...nextIds, selectedApp.id].slice(-maxMountedIframes);
    });
  }, [selectedApp]);

  useEffect(() => {
    setMountedIframeIds((current) => current.filter((iframeId) => apps.some((item) => item.id === iframeId && item.open_mode === "iframe")));
  }, [apps]);

  useEffect(() => {
    setIframeReloadTokens((current) => {
      const nextEntries = Object.entries(current).filter(([appId]) => apps.some((item) => item.id === Number(appId) && item.open_mode === "iframe"));
      return nextEntries.length === Object.keys(current).length ? current : Object.fromEntries(nextEntries);
    });
  }, [apps]);

  const refreshIframeApp = useCallback((app: WebAppEntry) => {
    if (app.open_mode !== "iframe") {
      return;
    }

    setMountedIframeIds((current) => {
      const nextIds = current.filter((iframeId) => iframeId !== app.id);
      return [...nextIds, app.id].slice(-maxMountedIframes);
    });
    setIframeReloadTokens((current) => ({
      ...current,
      [app.id]: (current[app.id] ?? 0) + 1,
    }));
  }, []);

  const resetIframes = useCallback(() => {
    setMountedIframeIds([]);
    setIframeReloadTokens({});
  }, []);

  return {
    mountedIframeIds,
    iframeReloadTokens,
    refreshIframeApp,
    resetIframes,
  };
}
