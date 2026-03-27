import { useEffect, useState } from "react";
import type { UserEntry } from "../types";

export function UserManagerModal({
  open,
  busy,
  currentUserId,
  users,
  onClose,
  onCreateInvitation,
  onChangeRole,
  onDeleteUser,
}: {
  open: boolean;
  busy: boolean;
  currentUserId: number;
  users: UserEntry[];
  onClose: () => void;
  onCreateInvitation: (role: "admin" | "viewer") => Promise<string>;
  onChangeRole: (userId: number, role: "admin" | "viewer") => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
}) {
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="editor-modal-overlay" onClick={onClose} role="presentation">
      <aside className="editor-modal group-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h3>Utilisateurs</h3>
          </div>
          <button className="ghost-icon-button" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="json-panel">
          <form
            className="user-create-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void onCreateInvitation(role).then((nextInviteLink) => {
                setInviteLink(nextInviteLink);
              });
            }}
          >
            <select value={role} onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "viewer")}>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
            <button className="primary-button" type="submit" disabled={busy}>
              Generer un lien d'invitation
            </button>
          </form>
          {inviteLink ? (
            <div className="invitation-link-row">
              <input type="text" readOnly value={inviteLink} aria-label="Lien d'invitation" />
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink);
                }}
              >
                Copier
              </button>
            </div>
          ) : (
            <p className="json-summary">Genere un lien, copie-le, puis envoie-le manuellement au futur utilisateur.</p>
          )}

          <div className="group-list">
            {users.map((user) => (
              <div key={user.id} className="group-item">
                <div className="user-row">
                  <div className="user-meta">
                    <strong>{user.username}</strong>
                    <small>{user.id === currentUserId ? "Vous" : `Compte #${user.id}`}</small>
                  </div>
                  <div className="user-actions">
                    <select
                      value={user.role}
                      onChange={(event) => void onChangeRole(user.id, event.target.value === "admin" ? "admin" : "viewer")}
                      disabled={busy || user.id === currentUserId}
                    >
                      <option value="viewer">viewer</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => void onDeleteUser(user.id)}
                      disabled={busy || user.id === currentUserId}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 ? <p className="json-summary">Aucun utilisateur.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
