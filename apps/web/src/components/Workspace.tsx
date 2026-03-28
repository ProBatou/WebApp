import type { WebAppEntry } from "../types";
import { useTranslation } from "../lib/i18n";

export function Workspace({
  selectedApp,
  mountedIframeApps,
  iframeReloadTokens,
}: {
  selectedApp: WebAppEntry | null;
  mountedIframeApps: WebAppEntry[];
  iframeReloadTokens: Record<number, number>;
}) {
  const { t } = useTranslation();

  return (
    <main className="workspace immersive-workspace">
      <div className="workspace-grid">
        <section className="viewer-panel">
          {!selectedApp ? <div className="empty-state">{t("workspace.selectApp")}</div> : null}
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
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-presentation allow-modals"
                  allow="fullscreen *; autoplay *; clipboard-write *; picture-in-picture *; encrypted-media *"
                />
              ))}
            </div>
          ) : null}
          {selectedApp?.open_mode === "external" ? (
            <div className="empty-state external-state">
              <p>{t("workspace.externalApp")}</p>
              <a className="primary-button" href={selectedApp.url} target="_blank" rel="noreferrer">
                {t("workspace.launch", { name: selectedApp.name })}
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
