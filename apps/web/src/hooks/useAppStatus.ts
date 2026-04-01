import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import type { AppPingResponse, AppStatusEntry, WebAppEntry } from "../types";

type AppStatusMap = Record<number, AppStatusEntry>;

const pollIntervalMs = 60000;
const initialLoadDelayMs = import.meta.env.DEV ? 1500 : 0;

function createUnknownStatusMap(apps: WebAppEntry[]) {
  return Object.fromEntries(
    apps.map((app) => [
      app.id,
      {
        status: "unknown",
        checkedAt: null,
      } satisfies AppStatusEntry,
    ])
  ) as AppStatusMap;
}

export function useAppStatus({
  apps,
  enabled,
}: {
  apps: WebAppEntry[];
  enabled: boolean;
}) {
  const [appStatuses, setAppStatuses] = useState<AppStatusMap>({});
  const appsRef = useRef(apps);
  appsRef.current = apps;
  const appIds = apps.map((app) => app.id).sort((a, b) => a - b).join(",");

  useEffect(() => {
    setAppStatuses((current) => {
      const nextEntries = appsRef.current.map((app) => [app.id, current[app.id] ?? { status: "unknown", checkedAt: null }] as const);
      return Object.fromEntries(nextEntries);
    });
  }, [appIds]);

  useEffect(() => {
    if (!enabled) {
      setAppStatuses({});
      return;
    }

    if (!appIds) {
      setAppStatuses({});
      return;
    }

    let cancelled = false;

    const loadStatuses = async () => {
      const results = await Promise.all(
        appsRef.current.map(async (app) => {
          try {
            const result = await apiFetch<AppPingResponse>(`/api/apps/${app.id}/ping`, { method: "GET" });
            return [app.id, { status: result.status, checkedAt: result.checkedAt } satisfies AppStatusEntry] as const;
          } catch {
            return [app.id, { status: "unknown", checkedAt: null } satisfies AppStatusEntry] as const;
          }
        })
      );

      if (cancelled) {
        return;
      }

      setAppStatuses(Object.fromEntries(results));
    };

    setAppStatuses(createUnknownStatusMap(appsRef.current));
    const initialLoadTimeoutId = window.setTimeout(() => {
      void loadStatuses();
    }, initialLoadDelayMs);

    const intervalId = window.setInterval(() => {
      void loadStatuses();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(initialLoadTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [appIds, enabled]);

  return {
    appStatuses,
  };
}
