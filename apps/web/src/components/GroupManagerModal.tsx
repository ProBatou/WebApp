import { useEffect, useState } from "react";
import type { GroupEntry } from "../types";

export function GroupManagerModal({
  open,
  busy,
  groups,
  onClose,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: {
  open: boolean;
  busy: boolean;
  groups: GroupEntry[];
  onClose: () => void;
  onCreateGroup: (name: string) => Promise<void>;
  onRenameGroup: (groupId: number, name: string) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

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
            <p className="eyebrow">Organisation</p>
            <h3>Groupes</h3>
          </div>
          <button className="ghost-icon-button" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="json-panel">
          <form
            className="group-create-row"
            onSubmit={(event) => {
              event.preventDefault();
              void onCreateGroup(newGroupName.trim()).then(() => setNewGroupName(""));
            }}
          >
            <input
              type="text"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Nouveau groupe"
              minLength={2}
              maxLength={40}
              required
            />
            <button className="primary-button" type="submit" disabled={busy}>
              Ajouter
            </button>
          </form>

          <div className="group-list">
            {groups.map((group) => (
              <div key={group.id} className="group-item">
                {editingGroupId === group.id ? (
                  <form
                    className="group-edit-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void onRenameGroup(group.id, editingGroupName.trim()).then(() => {
                        setEditingGroupId(null);
                        setEditingGroupName("");
                      });
                    }}
                  >
                    <input
                      type="text"
                      value={editingGroupName}
                      onChange={(event) => setEditingGroupName(event.target.value)}
                      minLength={2}
                      maxLength={40}
                      required
                    />
                    <button className="secondary-button" type="submit" disabled={busy}>
                      Enregistrer
                    </button>
                  </form>
                ) : (
                  <div className="group-item-row">
                    <strong>{group.name}</strong>
                    <div className="group-item-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingGroupName(group.name);
                        }}
                      >
                        Renommer
                      </button>
                      <button className="danger-button" type="button" onClick={() => void onDeleteGroup(group.id)} disabled={busy}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {groups.length === 0 ? <p className="json-summary">Aucun groupe pour le moment.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
