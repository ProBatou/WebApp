import { useEffect } from "react";

export function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  open,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="editor-modal-overlay" onClick={onCancel} role="presentation">
      <aside className="editor-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Confirmation</p>
            <h3>Confirmer l'action</h3>
          </div>
        </div>
        <div className="json-panel">
          <p className="json-summary">{message}</p>
          <div className="editor-actions">
            <button className="danger-button" type="button" onClick={onConfirm}>
              Confirmer
            </button>
            <button className="secondary-button" type="button" onClick={onCancel}>
              Annuler
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
