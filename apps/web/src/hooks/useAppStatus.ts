import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { AppPingResponse, AppStatusEntry, WebAppEntry } from "../types";

type AppStatusMap = Record<number, AppStatusEntry>;

const pollIntervalMs = 60000;

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

  useEffect(() => {
    setAppStatuses((current) => {
      const nextEntries = apps.map((app) => [app.id, current[app.id] ?? { status: "unknown", checkedAt: null }] as const);
      return Object.fromEntries(nextEntries);
    });
  }, [apps]);

  useEffect(() => {
    if (!enabled) {
      setAppStatuses({});
      return;
    }

    if (apps.length === 0) {
      setAppStatuses({});
      return;
    }

    let cancelled = false;

    const loadStatuses = async () => {
      const results = await Promise.all(
        apps.map(async (app) => {
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

    setAppStatuses(createUnknownStatusMap(apps));
    void loadStatuses();

    const intervalId = window.setInterval(() => {
      void loadStatuses();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [apps, enabled]);

  return {
    appStatuses,
  };
}
