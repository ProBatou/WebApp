import { useEffect } from "react";
import { useTranslation } from "../lib/i18n";

export function ShortcutHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

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
            <p className="eyebrow">{t("modal.navigation")}</p>
            <h3>{t("modal.keyboardShortcuts")}</h3>
          </div>
        </div>

        <div className="json-panel">
          <div className="shortcut-list">
            <div className="shortcut-item">
              <kbd>N</kbd>
              <span>{t("modal.shortcutOpenCreate")}</span>
            </div>
            <div className="shortcut-item">
              <kbd>?</kbd>
              <span>{t("modal.shortcutShowHelp")}</span>
            </div>
            <div className="shortcut-item">
              <kbd>Escape</kbd>
              <span>{t("modal.shortcutClose")}</span>
            </div>
          </div>

          <div className="editor-actions">
            <button className="secondary-button json-close-action" type="button" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
