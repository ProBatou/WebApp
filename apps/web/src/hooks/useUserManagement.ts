import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { apiFetch } from "../lib/api";
import type { AuthUser, InvitationResponse, UserEntry, UsersResponse } from "../types";

type UserManagementOptions = {
  pushToast: (message: string) => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string | null) => void;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  clearAppState: () => void;
  clearUiState: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export function useUserManagement({
  pushToast,
  setBusy,
  setError,
  setUser,
  clearAppState,
  clearUiState,
  t,
}: UserManagementOptions) {
  const [managedUsers, setManagedUsers] = useState<UserEntry[]>([]);

  const reloadUsers = useCallback(async () => {
    const result = await apiFetch<UsersResponse>("/api/users", { method: "GET" });
    setManagedUsers(result.items);
  }, []);

  const handleUpdateUsername = useCallback(async (newUsername: string) => {
    const result = await apiFetch<{ username: string }>("/api/user/username", {
      method: "PUT",
      body: JSON.stringify({ username: newUsername }),
    });
    setUser((user) => user ? { ...user, username: result.username } : user);
  }, [setUser]);

  const handleUpdatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await apiFetch<{ ok: boolean }>("/api/user/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }, []);

  const handleDeleteSelf = useCallback(async () => {
    await apiFetch<{ deleted: boolean }>("/api/user", { method: "DELETE" });
    setUser(null);
    clearAppState();
    clearUiState();
  }, [clearAppState, clearUiState, setUser]);

  const handleCreateInvitation = useCallback(async (role: "admin" | "viewer") => {
    try {
      setBusy(true);
      setError(null);
      const result = await apiFetch<InvitationResponse>("/api/invitations", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      pushToast("toast.inviteLinkCreated");
      return result.inviteUrl;
    } finally {
      setBusy(false);
    }
  }, [pushToast, setBusy, setError]);

  const handleChangeUserRole = useCallback(async (userId: number, role: "admin" | "viewer") => {
    try {
      setBusy(true);
      setError(null);
      const result = await apiFetch<UsersResponse>(`/api/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      setManagedUsers(result.items);
      pushToast("toast.userRoleUpdated");
    } finally {
      setBusy(false);
    }
  }, [pushToast, setBusy, setError]);

  const handleDeleteUser = useCallback(async (userId: number) => {
    const managedUser = managedUsers.find((item) => item.id === userId);
    try {
      setBusy(true);
      setError(null);
      const result = await apiFetch<UsersResponse>(`/api/users/${userId}`, {
        method: "DELETE",
      });
      setManagedUsers(result.items);
      pushToast(managedUser ? t("toast.userDeleted", { name: managedUser.username }) : "toast.userDeletedFallback");
    } finally {
      setBusy(false);
    }
  }, [managedUsers, pushToast, setBusy, setError, t]);

  const handleCopyInvitationLink = useCallback(async (inviteLink: string) => {
    await navigator.clipboard.writeText(inviteLink);
    pushToast("toast.inviteLinkCopied");
  }, [pushToast]);

  return {
    managedUsers,
    reloadUsers,
    handleUpdateUsername,
    handleUpdatePassword,
    handleDeleteSelf,
    handleCreateInvitation,
    handleChangeUserRole,
    handleDeleteUser,
    handleCopyInvitationLink,
  };
}
