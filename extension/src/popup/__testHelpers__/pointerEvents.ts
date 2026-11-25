// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

/**
 * `jest-fixed-jsdom` has no `PointerEvent`, so `@testing-library/react`'s
 * `fireEvent.pointerDown`/`pointerMove`/etc. fall back to constructing a bare
 * `Event`, which drops `clientX` and `pointerId` before they ever reach
 * React's pointer handlers. Extending `MouseEvent` — which jsdom does
 * support, and which is what a real `PointerEvent` itself extends — restores
 * those fields so pointer-driven components can be exercised under jsdom.
 * Idempotent and a no-op when the environment already has `PointerEvent`
 * (a real browser, or a future jsdom).
 */
export const installPointerEventPolyfill = (): void => {
  if (typeof window.PointerEvent !== "undefined") {
    return;
  }

  class PointerEvent extends MouseEvent {
    readonly pointerId: number;

    readonly pointerType: string;

    readonly isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }

  window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
  globalThis.PointerEvent = window.PointerEvent;
};

/** Stubs every svg's rect; restore with `jest.restoreAllMocks()` or the spy. */
export const mockChartRect = (width = 640, height = 280) =>
  // Linted as source (not under __tests__), so the jest global is unknown here.
  // eslint-disable-next-line no-undef
  jest.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  } as DOMRect);
