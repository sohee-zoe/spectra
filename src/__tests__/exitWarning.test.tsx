import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { createExitWarningController, isRefreshKeyboardEvent } from "../exitWarning";

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});

describe("exit warning", () => {
  it("registers the refresh key interceptor in capture phase", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    render(<App />);

    expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);
  });

  it("detects refresh keyboard shortcuts consistently", () => {
    expect(isRefreshKeyboardEvent({ key: "F5", ctrlKey: false, metaKey: false })).toBe(true);
    expect(isRefreshKeyboardEvent({ key: "r", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isRefreshKeyboardEvent({ key: "R", ctrlKey: false, metaKey: true })).toBe(true);
    expect(isRefreshKeyboardEvent({ key: "k", ctrlKey: true, metaKey: false })).toBe(false);
  });

  it("shows the exit modal for refresh keys only when changes are pending", () => {
    const showExitModal = vi.fn();
    const controller = createExitWarningController({
      hasPendingChanges: () => true,
      showExitModal,
    });
    const preventDefault = vi.fn();

    controller.handleKeyDown({
      key: "r",
      ctrlKey: true,
      metaKey: false,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(showExitModal).toHaveBeenCalledTimes(1);
  });

  it("cancels the delayed exit modal when pagehide fires", () => {
    vi.useFakeTimers();

    const showExitModal = vi.fn();
    const controller = createExitWarningController({
      hasPendingChanges: () => true,
      showExitModal,
    });
    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined as string | undefined,
    };

    controller.handleBeforeUnload(event);
    controller.handlePageHide();
    vi.advanceTimersByTime(200);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe("unsaved");
    expect(showExitModal).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
