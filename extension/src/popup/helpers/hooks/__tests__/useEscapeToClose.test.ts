import { fireEvent, renderHook } from "@testing-library/react";

import { useEscapeToClose } from "../useEscapeToClose";

// fireEvent returns false when a listener called preventDefault().
const pressEscape = () => fireEvent.keyDown(document, { key: "Escape" });

describe("useEscapeToClose", () => {
  it("closes the screen on Esc, and marks the key handled so the popup stays open", () => {
    const onClose = jest.fn();
    renderHook(() => useEscapeToClose(onClose));

    expect(pressEscape()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes one screen per press: a held Esc's repeats stay handled but close nothing more", () => {
    const onClose = jest.fn();
    renderHook(() => useEscapeToClose(onClose));
    // Holding the key, the browser repeats keydown with `repeat` set.
    const holdEscape = () =>
      fireEvent.keyDown(document, { key: "Escape", repeat: true });

    expect(pressEscape()).toBe(false);
    expect(holdEscape()).toBe(false);
    expect(holdEscape()).toBe(false);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys", () => {
    const onClose = jest.fn();
    renderHook(() => useEscapeToClose(onClose));

    expect(fireEvent.keyDown(document, { key: "Enter" })).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("leaves an Esc that something else already handled", () => {
    const onClose = jest.fn();
    renderHook(() => useEscapeToClose(onClose));
    const handled = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();

    document.dispatchEvent(handled);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops listening once the screen is gone", () => {
    const onClose = jest.fn();
    const { unmount } = renderHook(() => useEscapeToClose(onClose));

    unmount();
    pressEscape();

    expect(onClose).not.toHaveBeenCalled();
  });
});
