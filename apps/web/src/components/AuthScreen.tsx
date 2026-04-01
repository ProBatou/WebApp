import type { Dispatch, FormEvent, SetStateAction } from "react";
import { LanguageDropdown } from "./LanguageDropdown";
import { useTranslation, type SupportedLanguage } from "../lib/i18n";
import type { ThemeMode } from "../types";

export function AuthScreen({
  needsSetup,
  demoMode,
  themeMode,
  busy,
  authError,
  credentials,
  inviteToken,
  inviteRole,
  lang,
  setLang,
  setCredentials,
  onSubmit,
  onToggleTheme,
}: {
  needsSetup: boolean;
  demoMode: boolean;
  themeMode: ThemeMode;
  busy: boolean;
  authError: string | null;
  credentials: { username: string; password: string };
  inviteToken: string | null;
  inviteRole: "admin" | "viewer" | null;
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  setCredentials: Dispatch<SetStateAction<{ username: string; password: string }>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleTheme: () => void;
}) {
  const { t } = useTranslation();
  const inviteMode = Boolean(inviteToken);
  const eyebrow = inviteMode ? t("auth.invitation") : needsSetup ? t("auth.setup") : t("auth.signIn");
  const title = inviteMode
    ? t("auth.finishAccount")
    : needsSetup
      ? t("auth.createFirstAccount")
      : demoMode
        ? t("auth.enterDemoMode")
        : t("auth.enterDashboard");
  const subtitle = inviteMode
    ? t("auth.inviteSubtitle", { role: inviteRole ?? "viewer" })
    : needsSetup
      ? t("auth.setupSubtitle")
      : demoMode
        ? t("auth.demoSubtitle")
        : null;

  return (
    <div className="auth-shell">
      <section className="auth-panel auth-card form-panel">
        <div className="auth-card-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="auth-title">WebApp</h1>
          </div>
          <div className="auth-header-actions">
            <button className="ghost-icon-button theme-toggle" type="button" onClick={onToggleTheme} aria-label={t("app.themeToggleAria")}>
              {themeMode === "light" ? "◐" : "◑"}
            </button>
            <LanguageDropdown
              lang={lang}
              setLang={setLang}
              menuClassName="auth-language-menu"
              triggerClassName="ghost-icon-button auth-language-switch"
            />
          </div>
        </div>

        <div className="auth-copy-block">
          <h2>{title}</h2>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        </div>

        {demoMode && !inviteMode ? (
          <div className="auth-footer-note">
            <span className="auth-footer-dot" />
            <p>{t("auth.demoAccount")}</p>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            <span>{t("auth.username")}</span>
            <input
              type="text"
              value={credentials.username}
              onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
              minLength={3}
              maxLength={32}
              required
            />
          </label>
          <label>
            <span>{t("auth.password")}</span>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              minLength={demoMode ? 1 : 8}
              maxLength={128}
              required
            />
          </label>
          {authError ? <p className="form-error">{t(authError)}</p> : null}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {inviteMode ? t("auth.activateAccount") : needsSetup ? t("auth.createAccount") : t("auth.signIn")}
          </button>
        </form>

        <div className="auth-footer-note">
          <span className="auth-footer-dot" />
          <p>{needsSetup ? t("auth.initialSetup") : t("auth.sessionSecure")}</p>
        </div>
      </section>
    </div>
  );
}
