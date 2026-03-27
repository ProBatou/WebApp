import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { ThemeMode } from "../types";

export function AuthScreen({
  needsSetup,
  demoMode,
  themeMode,
  busy,
  authError,
  credentials,
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
  setCredentials: Dispatch<SetStateAction<{ username: string; password: string }>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleTheme: () => void;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-panel auth-card form-panel">
        <div className="auth-card-header">
          <div>
            <p className="eyebrow">{needsSetup ? "Initialisation" : "Connexion"}</p>
            <h1 className="auth-title">WebApp</h1>
          </div>
          <div className="auth-header-actions">
            <button className="ghost-icon-button theme-toggle" type="button" onClick={onToggleTheme} aria-label="Basculer le theme">
              {themeMode === "light" ? "◐" : "◑"}
            </button>
            <div className="auth-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div className="auth-copy-block">
          <h2>{needsSetup ? "Creer le premier compte" : demoMode ? "Entrer dans la demo" : "Entrer dans le dashboard"}</h2>
          <p className="auth-subtitle">
            {needsSetup
              ? "Configure l'acces initial a ton portail personnel."
              : demoMode
                ? "Utilise le compte demo fourni. Les modifications sont desactivees sur cette instance."
                : "Connecte-toi pour retrouver tes applications dans une interface epuree."}
          </p>
        </div>

        {demoMode ? (
          <div className="auth-footer-note">
            <span className="auth-footer-dot" />
            <p>Compte demo : `demo` / `demo`</p>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            <span>Nom d'utilisateur</span>
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
            <span>Mot de passe</span>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              minLength={demoMode ? 1 : 8}
              maxLength={128}
              required
            />
          </label>
          {authError ? <p className="form-error">{authError}</p> : null}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {needsSetup ? "Creer le compte" : "Se connecter"}
          </button>
        </form>

        <div className="auth-footer-note">
          <span className="auth-footer-dot" />
          <p>{needsSetup ? "Configuration initiale unique." : "Session securisee."}</p>
        </div>
      </section>
    </div>
  );
}
