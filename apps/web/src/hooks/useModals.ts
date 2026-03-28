import { useCallback, useState } from "react";

export type ConfirmState = {
  open: boolean;
  message: string;
  onConfirm: (() => void) | null;
};

const closedConfirmState: ConfirmState = {
  open: false,
  message: "",
  onConfirm: null,
};

export function useModals() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(closedConfirmState);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const openShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(false);
  }, []);

  const closeAuxiliaryModals = useCallback(() => {
    setSettingsOpen(false);
    setShortcutHelpOpen(false);
  }, []);

  const openConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmState({
      open: true,
      message,
      onConfirm,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(closedConfirmState);
  }, []);

  return {
    settingsOpen,
    shortcutHelpOpen,
    confirmState,
    openSettings,
    closeSettings,
    openShortcutHelp,
    closeShortcutHelp,
    closeAuxiliaryModals,
    openConfirm,
    closeConfirm,
  };
}
