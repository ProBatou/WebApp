import { memo } from "react";
import type { AuthPendingState, WebAppEntry } from "../types";
import { useTranslation } from "../lib/i18n";

export const Workspace = memo(function Workspace({
  selectedApp,
  authPending,
  mountedIframeApps,
  iframeReloadTokens,
  onOpenAuthPending,
  onDismissAuthPending,
}: {
  selectedApp: WebAppEntry | null;
  authPending: AuthPendingState | null;
  mountedIframeApps: WebAppEntry[];
  iframeReloadTokens: Record<number, number>;
  onOpenAuthPending: () => void;
  onDismissAuthPending: () => void;
}) {
  const { t } = useTranslation();
  const showAuthState = selectedApp?.open_mode === "iframe" && authPending?.appId === selectedApp.id;
  const showAuthOverlay = showAuthState && (authPending.phase === "login" || authPending.phase === "settling");
  const showAuthPrompt = showAuthState && authPending.phase === "prompt";
  const activeIframeAppId = selectedApp?.open_mode === "iframe" && !showAuthOverlay ? selectedApp.id : null;
  const authTitle = authPending?.phase === "settling" ? t("workspace.authSettlingTitle") : t("workspace.authPendingTitle");
  const authMessage = authPending?.phase === "settling" ? t("workspace.authSettlingMessage") : t("workspace.authPendingMessage");

  return (
    <main className="workspace immersive-workspace">
      <div className="workspace-grid">
        <section className="viewer-panel">
          {mountedIframeApps.length > 0 ? (
            <div className="iframe-stack">
              {mountedIframeApps.map((app) => {
                if (showAuthOverlay && app.id === selectedApp.id && !authPending?.keepMountedFrame) {
                  return null;
                }

                return (
                  <iframe
                    key={`${app.id}-${iframeReloadTokens[app.id] ?? 0}`}
                    className={app.id === activeIframeAppId ? "app-frame active" : "app-frame inactive"}
                    src={app.url}
                    title={app.name}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="fullscreen *; autoplay *; clipboard-write *; picture-in-picture *; encrypted-media *"
                  />
                );
              })}
            </div>
          ) : null}
          {showAuthPrompt ? (
            <div className="floating-banner inline-banner auth-prompt-banner" role="status" aria-live="polite">
              <div className="auth-prompt-copy">
                <p className="auth-prompt-title">{t("workspace.authPromptTitle")}</p>
                <p className="auth-prompt-message">{t("workspace.authPromptMessage")}</p>
              </div>
              <div className="auth-prompt-actions">
                <button className="primary-button" type="button" onClick={onOpenAuthPending}>
                  {t("workspace.openAuth")}
                </button>
                <button className="secondary-button" type="button" onClick={onDismissAuthPending}>
                  {t("workspace.dismissAuthPrompt")}
                </button>
              </div>
            </div>
          ) : null}
          {!selectedApp ? <div className="viewer-state-overlay empty-state">{t("workspace.selectApp")}</div> : null}
          {showAuthOverlay ? (
            <div className="auth-pending-overlay" role="status" aria-live="polite">
              <div className="auth-pending-card">
                <div className="auth-pending-header">
                  <span className="busy-spinner auth-pending-spinner" aria-hidden="true" />
                  <p className="auth-pending-title">{authTitle}</p>
                </div>
                <p className="auth-pending-message">{authMessage}</p>
              </div>
            </div>
          ) : null}
          {selectedApp?.open_mode === "external" ? (
            <div className="viewer-state-overlay empty-state external-state">
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
});
