import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { AuthUser, BootstrapResponse } from "../types";

export function useAuth({
  reloadApps,
  clearAppState,
  clearUiState,
  setError,
  setBusy,
}: {
  reloadApps: () => Promise<void>;
  clearAppState: () => void;
  clearUiState: () => void;
  setError: (value: string | null) => void;
  setBusy: (value: boolean) => void;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFetch<BootstrapResponse>("/api/bootstrap", { method: "GET" });
        setNeedsSetup(result.needsSetup);
        setDemoMode(result.demoMode);
        setUser(result.user);
        setCredentials(result.demoMode ? { username: "demo", password: "demo" } : { username: "", password: "" });

        if (result.user) {
          await reloadApps();
        }
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [reloadApps, setError]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setBusy(true);
      setAuthError(null);

      const endpoint = needsSetup ? "/api/setup" : "/api/login";
      const result = await apiFetch<{ user: AuthUser }>(endpoint, {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      setUser(result.user);
      setNeedsSetup(false);
      await reloadApps();
      setCredentials({ username: "", password: "" });
    } catch (submitError) {
      setAuthError(submitError instanceof Error ? submitError.message : "Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      setBusy(true);
      await apiFetch<null>("/api/logout", { method: "POST" });
      setUser(null);
      clearAppState();
      clearUiState();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Erreur de deconnexion.");
    } finally {
      setBusy(false);
    }
  };

  return {
    user,
    needsSetup,
    demoMode,
    loading,
    authError,
    credentials,
    setCredentials,
    handleAuthSubmit,
    handleLogout,
  };
}
