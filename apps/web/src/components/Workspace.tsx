import type { DashboardIconsMetadataMap, ThemeMode, WebAppEntry } from "../types";

export function Workspace({
  error,
  selectedApp,
  mountedIframeApps,
  iframeReloadTokens,
}: {
  error: string | null;
  selectedApp: WebAppEntry | null;
  mountedIframeApps: WebAppEntry[];
  iframeReloadTokens: Record<number, number>;
}) {
  return (
    <main className="workspace immersive-workspace">
      <div className="workspace-grid">
        <section className="viewer-panel">
          {error ? <div className="inline-banner error-state floating-banner">{error}</div> : null}

          {!selectedApp ? <div className="empty-state">Selectionne ou cree une application.</div> : null}
          {selectedApp?.open_mode === "iframe" ? (
            <div className="iframe-stack">
              {mountedIframeApps.map((app) => (
                <iframe
                  key={`${app.id}-${iframeReloadTokens[app.id] ?? 0}`}
                  className={app.id === selectedApp.id ? "app-frame active" : "app-frame inactive"}
                  src={app.url}
                  title={app.name}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ))}
            </div>
          ) : null}
          {selectedApp?.open_mode === "external" ? (
            <div className="empty-state external-state">
              <p>Cette application est configuree pour s'ouvrir hors de WebApp.</p>
              <a className="primary-button" href={selectedApp.url} target="_blank" rel="noreferrer">
                Lancer {selectedApp.name}
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
