import { useEffect } from "react";

export function ShortcutHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
      <aside className="editor-modal shortcut-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Navigation</p>
            <h3>Raccourcis clavier</h3>
          </div>
        </div>

        <div className="json-panel">
          <div className="shortcut-list">
            <div className="shortcut-item">
              <kbd>N</kbd>
              <span>Ouvrir la creation d'application</span>
            </div>
            <div className="shortcut-item">
              <kbd>?</kbd>
              <span>Afficher cette aide</span>
            </div>
            <div className="shortcut-item">
              <kbd>Escape</kbd>
              <span>Fermer le menu contextuel ou la fenetre ouverte</span>
            </div>
          </div>

          <div className="editor-actions">
            <button className="secondary-button json-close-action" type="button" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
