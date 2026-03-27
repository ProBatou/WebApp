import { useCallback, useEffect, useRef, useState } from "react";

type ToastTone = "info" | "error";

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const toastDurationMs = 4000;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastIdRef = useRef(1);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback((message: string, tone: ToastTone = "info") => {
    const toastId = nextToastIdRef.current;
    nextToastIdRef.current += 1;

    setToasts((current) => [...current, { id: toastId, message, tone }]);
    return toastId;
  }, []);

  const pushErrorToast = useCallback((message: string) => {
    pushToast(message, "error");
  }, [pushToast]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timeoutIds = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, toastDurationMs)
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [dismissToast, toasts]);

  return {
    toasts,
    pushToast,
    pushErrorToast,
    dismissToast,
  };
}
