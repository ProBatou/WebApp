import { useEffect, useState } from "react";
import type { UserEntry } from "../types";

export function UserManagerModal({
  open,
  busy,
  currentUserId,
  users,
  onClose,
  onCreateUser,
  onChangeRole,
  onDeleteUser,
}: {
  open: boolean;
  busy: boolean;
  currentUserId: number;
  users: UserEntry[];
  onClose: () => void;
  onCreateUser: (payload: { username: string; password: string; role: "admin" | "viewer" }) => Promise<void>;
  onChangeRole: (userId: number, role: "admin" | "viewer") => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");

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
              void onCreateUser({ username: username.trim(), password, role }).then(() => {
                setUsername("");
                setPassword("");
                setRole("viewer");
              });
            }}
          >
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Nom d'utilisateur"
              minLength={3}
              maxLength={32}
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
              minLength={8}
              maxLength={128}
              required
            />
            <select value={role} onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "viewer")}>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
            <button className="primary-button" type="submit" disabled={busy}>
              Ajouter
            </button>
          </form>

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
