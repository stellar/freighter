import React from "react";
import { render, screen, act } from "@testing-library/react";

import { REDUCED_MOTION_QUERY } from "helpers/hooks/usePrefersReducedMotion";
import {
  Shimmer,
  SHIMMER_CYCLE_MS,
  ShimmerVariant,
} from "popup/components/Shimmer";

const setReducedMotion = (matches: boolean) => {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches,
    media: REDUCED_MOTION_QUERY,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) =>
      listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) =>
      listeners.delete(fn),
  };
  window.matchMedia = jest.fn().mockReturnValue(mql) as never;
  return (next: boolean) => {
    mql.matches = next;
    listeners.forEach((fn) => fn({ matches: next }));
  };
};

describe("Shimmer", () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
  });

  it("sizes itself, picks the variant class, and is hidden from assistive tech", () => {
    setReducedMotion(false);
    render(<Shimmer data-testid="s" width="9.125rem" height="1.5rem" />);
    const el = screen.getByTestId("s");
    expect(el.tagName.toLowerCase()).toBe("span");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveClass("Shimmer", "Shimmer--pill");
    expect(el).not.toHaveClass("Shimmer--static");
    expect(el.style.width).toBe("9.125rem");
    expect(el.style.height).toBe("1.5rem");
  });

  it("supports the hairline variant and an extra class", () => {
    setReducedMotion(false);
    render(
      <Shimmer
        data-testid="s"
        variant={ShimmerVariant.Hairline}
        width="100%"
        height="1px"
        className="Extra"
      />,
    );
    expect(screen.getByTestId("s")).toHaveClass(
      "Shimmer",
      "Shimmer--hairline",
      "Extra",
    );
  });

  it("joins the running sweep: delays differ by the time between mounts", () => {
    setReducedMotion(false);
    const t0 = performance.now();
    const now = jest.spyOn(performance, "now");

    now.mockReturnValue(t0 + 1000);
    render(<Shimmer data-testid="a" width="1rem" height="1rem" />);
    now.mockReturnValue(t0 + 1000 + 250 + SHIMMER_CYCLE_MS + 700);
    render(<Shimmer data-testid="b" width="1rem" height="1rem" />);

    const delayMs = (id: string) => {
      const raw = screen
        .getByTestId(id)
        .style.getPropertyValue("--shimmer-delay");
      return Number(raw.replace("ms", ""));
    };
    const delayA = delayMs("a");
    const delayB = delayMs("b");

    expect(delayA).toBeGreaterThan(-SHIMMER_CYCLE_MS);
    expect(delayA).toBeLessThanOrEqual(0);
    expect(delayB).toBeGreaterThan(-SHIMMER_CYCLE_MS);
    expect(delayB).toBeLessThanOrEqual(0);

    const diff =
      (((delayA - delayB) % SHIMMER_CYCLE_MS) + SHIMMER_CYCLE_MS) %
      SHIMMER_CYCLE_MS;
    expect(diff).toBeCloseTo((250 + 700) % SHIMMER_CYCLE_MS);
  });

  it("is static under reduced motion, and follows the OS setting live", () => {
    const flip = setReducedMotion(true);
    render(<Shimmer data-testid="s" width="1rem" height="1rem" />);
    expect(screen.getByTestId("s")).toHaveClass("Shimmer--static");

    act(() => flip(false));
    expect(screen.getByTestId("s")).not.toHaveClass("Shimmer--static");
  });
});
