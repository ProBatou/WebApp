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
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [userManagerOpen, setUserManagerOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(closedConfirmState);

  const openGroupManager = useCallback(() => {
    setGroupManagerOpen(true);
  }, []);

  const closeGroupManager = useCallback(() => {
    setGroupManagerOpen(false);
  }, []);

  const openUserManager = useCallback(() => {
    setUserManagerOpen(true);
  }, []);

  const closeUserManager = useCallback(() => {
    setUserManagerOpen(false);
  }, []);

  const openShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(false);
  }, []);

  const closeAuxiliaryModals = useCallback(() => {
    setGroupManagerOpen(false);
    setUserManagerOpen(false);
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
    groupManagerOpen,
    userManagerOpen,
    shortcutHelpOpen,
    confirmState,
    openGroupManager,
    closeGroupManager,
    openUserManager,
    closeUserManager,
    openShortcutHelp,
    closeShortcutHelp,
    closeAuxiliaryModals,
    openConfirm,
    closeConfirm,
  };
}
