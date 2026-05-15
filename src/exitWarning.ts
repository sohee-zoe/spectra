type RefreshKeyEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "preventDefault">;
type BeforeUnloadLikeEvent = Pick<BeforeUnloadEvent, "preventDefault"> & {
  returnValue?: string;
};

type ExitWarningControllerOptions = {
  hasPendingChanges: () => boolean;
  showExitModal: () => void;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelScheduled?: (timerId: ReturnType<typeof setTimeout>) => void;
};

export function isRefreshKeyboardEvent(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey">): boolean {
  const key = event.key.toLowerCase();
  return key === "f5" || ((event.ctrlKey || event.metaKey) && key === "r");
}

export function createExitWarningController({
  hasPendingChanges,
  showExitModal,
  schedule = (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancelScheduled = (timerId) => window.clearTimeout(timerId),
}: ExitWarningControllerOptions) {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let shouldShow = false;

  const cancelPendingModal = () => {
    shouldShow = false;
    if (timerId !== null) {
      cancelScheduled(timerId);
      timerId = null;
    }
  };

  const handleKeyDown = (event: RefreshKeyEvent) => {
    if (!hasPendingChanges() || !isRefreshKeyboardEvent(event)) return;
    event.preventDefault();
    showExitModal();
  };

  const handleBeforeUnload = (event: BeforeUnloadLikeEvent) => {
    if (!hasPendingChanges()) return;
    event.preventDefault();
    event.returnValue = "unsaved";
    shouldShow = true;
    timerId = schedule(() => {
      if (shouldShow) showExitModal();
    }, 150);
  };

  return {
    handleKeyDown,
    handleBeforeUnload,
    handlePageHide: cancelPendingModal,
    dispose: cancelPendingModal,
  };
}
