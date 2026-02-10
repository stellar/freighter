import { renderHook, act } from "@testing-library/react";
import { useIsWideScreen } from "../hooks/useIsWideScreen";

describe("useIsWideScreen", () => {
  let listeners: Array<(e: { matches: boolean }) => void>;
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: currentMatches,
        media: query,
        addEventListener: jest.fn(
          (_event: string, handler: (e: { matches: boolean }) => void) => {
            listeners.push(handler);
          },
        ),
        removeEventListener: jest.fn(
          (_event: string, handler: (e: { matches: boolean }) => void) => {
            listeners = listeners.filter((l) => l !== handler);
          },
        ),
      })),
    });
  });

  it("returns false when viewport is below the default threshold", () => {
    currentMatches = false;
    const { result } = renderHook(() => useIsWideScreen());
    expect(result.current).toBe(false);
  });

  it("returns true when viewport is at or above the default threshold", () => {
    currentMatches = true;
    const { result } = renderHook(() => useIsWideScreen());
    expect(result.current).toBe(true);
  });

  it("accepts a custom minWidth", () => {
    currentMatches = true;
    renderHook(() => useIsWideScreen(1024));
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
  });

  it("updates when the media query match state changes", () => {
    currentMatches = false;
    const { result } = renderHook(() => useIsWideScreen());
    expect(result.current).toBe(false);

    act(() => {
      listeners.forEach((l) => l({ matches: true }));
    });
    expect(result.current).toBe(true);

    act(() => {
      listeners.forEach((l) => l({ matches: false }));
    });
    expect(result.current).toBe(false);
  });

  it("cleans up the listener on unmount", () => {
    const { unmount } = renderHook(() => useIsWideScreen());
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
