import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { AuthUser, BootstrapResponse, InvitationInfoResponse } from "../types";

function readInviteTokenFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("invite");
  return token?.trim() ? token : null;
}

function clearInviteTokenFromUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete("invite");
  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  window.history.replaceState(null, "", nextPath);
}

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
  const [inviteToken, setInviteToken] = useState<string | null>(() => readInviteTokenFromUrl());
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer" | null>(null);

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
          clearInviteTokenFromUrl();
          setInviteToken(null);
          setInviteRole(null);
          await reloadApps();
        } else if (inviteToken) {
          try {
            const invitation = await apiFetch<InvitationInfoResponse>(`/api/invitations/${encodeURIComponent(inviteToken)}`, { method: "GET" });
            setInviteRole(invitation.role);
          } catch {
            setInviteToken(null);
            setInviteRole(null);
            clearInviteTokenFromUrl();
            setAuthError("errors.invalidInvite");
          }
        }
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "errors.load");
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [inviteToken, reloadApps, setError]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setBusy(true);
      setAuthError(null);

      const endpoint = inviteToken
        ? `/api/invitations/${encodeURIComponent(inviteToken)}/accept`
        : needsSetup
          ? "/api/setup"
          : "/api/login";
      const result = await apiFetch<{ user: AuthUser }>(endpoint, {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      setUser(result.user);
      setNeedsSetup(false);
      if (inviteToken) {
        clearInviteTokenFromUrl();
        setInviteToken(null);
        setInviteRole(null);
      }
      await reloadApps();
      setCredentials({ username: "", password: "" });
    } catch (submitError) {
      setAuthError(submitError instanceof Error ? submitError.message : "errors.signIn");
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
      setError(logoutError instanceof Error ? logoutError.message : "errors.signOut");
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
    inviteToken,
    inviteRole,
    setCredentials,
    handleAuthSubmit,
    handleLogout,
  };
}
