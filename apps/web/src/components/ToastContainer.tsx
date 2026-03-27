import type { ToastItem } from "../hooks/useToast";
import { useTranslation } from "../lib/i18n";

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (toastId: number) => void;
}) {
  const { t } = useTranslation();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={toast.tone === "error" ? "toast-card error" : "toast-card"} role="status">
          <p>{t(toast.message)}</p>
          <button className="ghost-icon-button toast-dismiss" type="button" onClick={() => onDismiss(toast.id)} aria-label={t("modal.closeNotification")}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
