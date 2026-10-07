import React from "react";
import { act, render, screen } from "@testing-library/react";

import { ApiTokenPriceHistoryPoint } from "@shared/api/types";
import { LineChart, getPlottedRangeEnd } from "../LineChart";
import {
  CHART_MORPH_DURATION_MS,
  CHART_VIEWBOX_HEIGHT,
  CHART_VIEWBOX_WIDTH,
  PriceDirection,
} from "../constants";

const getPolylinePoints = () =>
  screen.getByTestId("TokenPriceChart__polyline").getAttribute("points") || "";

const getPolylineXs = () => {
  const polyline = screen.getByTestId("TokenPriceChart__polyline");
  const pointsAttr = polyline.getAttribute("points") || "";
  return pointsAttr
    .trim()
    .split(" ")
    .map((pair) => Number(pair.split(",")[0]));
};

describe("LineChart", () => {
  it("renders every returned point, positioned by timestamp — not array index", () => {
    // Sparse fixture with a big gap: buckets at 0, 900, 1800, then nothing
    // until 9000. Index-positioning would space them uniformly; timestamp
    // positioning stretches the final segment.
    const points = [
      { t: 0, p: "1.00" },
      { t: 900, p: "1.10" },
      { t: 1800, p: "1.05" },
      { t: 9000, p: "1.20" },
    ];

    render(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={20000}
        direction={PriceDirection.Positive}
        label="Price chart"
      />,
    );

    const xs = getPolylineXs();
    expect(xs).toHaveLength(4);

    // Buckets plot at t + resolutionSeconds: 900, 1800, 2700, 9900 → over a
    // 9000-wide domain the first three are uniform tenths and the gap segment
    // is 8x wider.
    const gapWidth = xs[3] - xs[2];
    const bucketWidth = xs[1] - xs[0];
    expect(bucketWidth).toBeGreaterThan(0);
    expect(gapWidth).toBeGreaterThan(bucketWidth * 7);
    expect(xs[3]).toBeCloseTo(CHART_VIEWBOX_WIDTH, 0);
  });

  it("clamps the final in-progress bucket to now instead of the future", () => {
    const points = [
      { t: 0, p: "1.00" },
      { t: 900, p: "1.10" },
      { t: 1800, p: "1.05" },
    ];

    // now = 1900: the last bucket would plot at 2700 (t + resolution), in the
    // future. It must clamp to 1900 — repositioning the existing point, never
    // substituting spot or adding one.
    render(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={1900}
        direction={PriceDirection.Positive}
        label="Price chart"
      />,
    );

    const xs = getPolylineXs();
    expect(xs).toHaveLength(3);
    // Domain is [900, 1900]; the middle point (1800) sits at 90% of the
    // width, so the clamped final segment is visibly shorter than the first.
    expect(xs[2] - xs[1]).toBeLessThan(xs[1] - xs[0]);
    expect(xs[2]).toBeCloseTo(CHART_VIEWBOX_WIDTH, 0);
  });

  it("stays monotonic when the device clock is behind the plotted series", () => {
    // Clock skew: `now` sits before the last two bucket ends. Clamping the
    // final point to `now` alone would push it BEFORE the point it follows —
    // the line doubles back, the fill polygon self-intersects, and the time
    // span goes negative (which `|| 1` does not catch, because it is not 0).
    const points = [
      { t: 0, p: "1.00" },
      { t: 900, p: "1.10" },
      { t: 1800, p: "1.05" },
    ];

    render(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={500}
        direction={PriceDirection.Positive}
        label="Price chart"
      />,
    );

    const xs = getPolylineXs();
    expect(xs).toHaveLength(3);
    // Never negative, never doubling back.
    xs.forEach((x) => expect(x).toBeGreaterThanOrEqual(0));
    expect(xs[1]).toBeGreaterThanOrEqual(xs[0]);
    expect(xs[2]).toBeGreaterThanOrEqual(xs[1]);
    // The clamp floors at the previous bucket end, so the final point lands
    // exactly on its predecessor rather than before it.
    expect(xs[2]).toBe(xs[1]);
    expect(xs[2]).toBeCloseTo(CHART_VIEWBOX_WIDTH, 0);
  });

  it("paints the whole artwork from the direction — stroke, gradient, and dot", () => {
    // The artwork is drawn in `currentColor` throughout, so the direction
    // class on the root is what colours the polyline, the gradient fill and
    // the end dot together. A negative range draws red, not green.
    const points = [
      { t: 0, p: "1.10" },
      { t: 900, p: "1.00" },
    ];

    const { rerender } = render(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={2000}
        direction={PriceDirection.Negative}
        label="Price chart"
      />,
    );

    const svg = () => screen.getByTestId("TokenPriceChart__svg");
    expect(svg()).toHaveClass("LineChart--negative");
    expect(svg()).not.toHaveClass("LineChart--positive");
    // Every mark reads the class's colour rather than a hardcoded one.
    expect(
      screen.getByTestId("TokenPriceChart__polyline").getAttribute("stroke"),
    ).toBe("currentColor");
    expect(svg().querySelector("stop")?.getAttribute("stop-color")).toBe(
      "currentColor",
    );
    expect(
      screen.getByTestId("TokenPriceChart__end-dot").getAttribute("stroke"),
    ).toBe("currentColor");
    rerender(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={2000}
        direction={PriceDirection.Positive}
        label="Price chart"
      />,
    );
    expect(svg()).toHaveClass("LineChart--positive");

    rerender(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={2000}
        direction={PriceDirection.Neutral}
        label="Price chart"
      />,
    );
    expect(svg()).toHaveClass("LineChart--neutral");
  });

  it("exposes a text alternative for screen readers", () => {
    render(
      <LineChart
        points={[
          { t: 0, p: "1.00" },
          { t: 900, p: "1.10" },
        ]}
        resolutionSeconds={900}
        nowSeconds={2000}
        direction={PriceDirection.Neutral}
        label="Price chart, 1D: Aug 25 to Aug 26, +0.86%"
      />,
    );

    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Price chart, 1D: Aug 25 to Aug 26, +0.86%",
    );
  });
});

describe("getPlottedRangeEnd", () => {
  // The chart's text alternative announces this value, so it has to be the one
  // the plot uses — it is exported for that reason, not for its own sake.
  const points: ApiTokenPriceHistoryPoint[] = [
    { t: 0, p: "1.00" },
    { t: 900, p: "1.10" },
  ];

  it("clamps an in-progress final bucket to now", () => {
    expect(
      getPlottedRangeEnd({ points, resolutionSeconds: 900, nowSeconds: 1200 }),
    ).toBe(1200);
  });

  it("leaves a bucket that has already closed at its own end", () => {
    expect(
      getPlottedRangeEnd({ points, resolutionSeconds: 900, nowSeconds: 5000 }),
    ).toBe(1800);
  });

  it("never returns a value before the preceding point's end", () => {
    // Device clock behind the server: clamping to `now` alone would put the
    // range end before the point it follows.
    expect(
      getPlottedRangeEnd({ points, resolutionSeconds: 900, nowSeconds: 100 }),
    ).toBe(900);
  });

  it("clamps a single-point series with no predecessor to floor against", () => {
    expect(
      getPlottedRangeEnd({
        points: [points[0]],
        resolutionSeconds: 900,
        nowSeconds: 100,
      }),
    ).toBe(100);
  });
});

describe("LineChart timeframe morph", () => {
  // Three series with different point counts and different x positions —
  // exactly the case a shared-grid resample would have to fake.
  //
  // RISING  → coordinates (0, 132) (320, 8)
  // VALLEY  → coordinates (0, 8) (160, 132) (320, 8)
  // FALLING → coordinates (0, 8) (320, 132)
  const RISING: ApiTokenPriceHistoryPoint[] = [
    { t: 0, p: "1.00" },
    { t: 900, p: "2.00" },
  ];
  const VALLEY: ApiTokenPriceHistoryPoint[] = [
    { t: 0, p: "2.00" },
    { t: 900, p: "1.00" },
    { t: 1800, p: "2.00" },
  ];
  const FALLING: ApiTokenPriceHistoryPoint[] = [
    { t: 0, p: "1.50" },
    { t: 900, p: "1.00" },
  ];

  const chart = (points: ApiTokenPriceHistoryPoint[]) => (
    <LineChart
      points={points}
      resolutionSeconds={900}
      nowSeconds={5000}
      direction={PriceDirection.Positive}
      label="Price chart"
    />
  );

  let pendingFrames: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let cancelSpy: jest.Mock;
  let originalRaf: typeof window.requestAnimationFrame;
  let originalCancelRaf: typeof window.cancelAnimationFrame;
  let originalMatchMedia: typeof window.matchMedia;

  /** Runs every frame scheduled so far, at `timestamp`. */
  const flushFrame = (timestamp: number) => {
    const due = [...pendingFrames.entries()];
    pendingFrames.clear();
    act(() => {
      due.forEach(([, callback]) => callback(timestamp));
    });
  };

  const setPrefersReducedMotion = (reduce: boolean) => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduce : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;
  };

  beforeEach(() => {
    pendingFrames = new Map();
    nextFrameId = 0;
    originalRaf = window.requestAnimationFrame;
    originalCancelRaf = window.cancelAnimationFrame;
    originalMatchMedia = window.matchMedia;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      nextFrameId += 1;
      pendingFrames.set(nextFrameId, callback);
      return nextFrameId;
    }) as typeof window.requestAnimationFrame;
    cancelSpy = jest.fn((id: number) => {
      pendingFrames.delete(id);
    });
    window.cancelAnimationFrame =
      cancelSpy as unknown as typeof window.cancelAnimationFrame;
    setPrefersReducedMotion(false);
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancelRaf;
    window.matchMedia = originalMatchMedia;
  });

  it("paints the settled geometry on the first render — nothing to morph from", () => {
    // Without `riseFromFlat` the component mounts fresh with no previous line
    // on screen, so there is no tween to run.
    render(chart(VALLEY));

    expect(getPolylinePoints()).toBe("0,8 160,132 320,8");
    expect(pendingFrames.size).toBe(0);
    expect(screen.getByTestId("TokenPriceChart__svg")).not.toHaveClass(
      "LineChart--rise",
    );
  });

  it("rises from a flat line at the vertical centre when replacing the loading hairline", () => {
    render(
      <LineChart
        points={VALLEY}
        resolutionSeconds={900}
        nowSeconds={5000}
        direction={PriceDirection.Positive}
        label="Price chart"
        riseFromFlat
      />,
    );
    const mid = CHART_VIEWBOX_HEIGHT / 2;
    expect(getPolylinePoints()).toBe(`0,${mid} 160,${mid} 320,${mid}`);
    expect(screen.getByTestId("TokenPriceChart__svg")).toHaveClass(
      "LineChart--rise",
    );

    flushFrame(0);
    flushFrame(CHART_MORPH_DURATION_MS);
    expect(getPolylinePoints()).toBe("0,8 160,132 320,8");
    expect(pendingFrames.size).toBe(0);
  });

  it("does not rise under reduced motion", () => {
    setPrefersReducedMotion(true);
    render(
      <LineChart
        points={VALLEY}
        resolutionSeconds={900}
        nowSeconds={5000}
        direction={PriceDirection.Positive}
        label="Price chart"
        riseFromFlat
      />,
    );
    expect(getPolylinePoints()).toBe("0,8 160,132 320,8");
    expect(pendingFrames.size).toBe(0);
    expect(screen.getByTestId("TokenPriceChart__svg")).not.toHaveClass(
      "LineChart--rise",
    );
  });

  it("morphs from the outgoing shape rather than hard-cutting to the new one", () => {
    const { rerender } = render(chart(RISING));
    expect(getPolylinePoints()).toBe("0,132 320,8");

    rerender(chart(VALLEY));
    // The new series is selected, but nothing has been painted yet: the line
    // still shows what it showed, not a hard cut.
    expect(getPolylinePoints()).toBe("0,132 320,8");

    // Frame 0 — the outgoing shape, resampled onto the INCOMING x positions.
    // RISING at x = 160 is y = 70.
    flushFrame(0);
    expect(getPolylinePoints()).toBe("0,132 160,70 320,8");

    // Halfway through, cubic-eased: 1 - (1 - 0.5)^3 = 0.875 of the distance.
    flushFrame(CHART_MORPH_DURATION_MS / 2);
    expect(getPolylinePoints()).toBe("0,23.5 160,124.25 320,8");
  });

  it("settles on exactly the geometry a hard switch would have drawn", () => {
    const settled = render(chart(VALLEY));
    const hardCutPoints = getPolylinePoints();
    settled.unmount();

    const { rerender } = render(chart(RISING));
    rerender(chart(VALLEY));
    flushFrame(0);
    flushFrame(CHART_MORPH_DURATION_MS / 2);
    flushFrame(CHART_MORPH_DURATION_MS);

    // Not "close to" — identical. The settled chart is the series the server
    // sent, never a resampled approximation of it.
    expect(getPolylinePoints()).toBe(hardCutPoints);
    // And the morph stops: no frame is left scheduled.
    expect(pendingFrames.size).toBe(0);
  });

  it("carries the gradient fill and the end dot along with the line", () => {
    const { rerender } = render(chart(RISING));
    rerender(chart(VALLEY));
    flushFrame(0);

    const svg = screen.getByTestId("TokenPriceChart__svg");
    expect(svg.querySelector("polygon")?.getAttribute("points")).toBe(
      "0,132 160,70 320,8 320,140 0,140",
    );
    expect(
      screen.getByTestId("TokenPriceChart__end-dot").getAttribute("d"),
    ).toBe("M320,8 h0.01");
  });

  it("keeps the end dot circular under the non-uniform outer scaling", () => {
    // The outer svg is `preserveAspectRatio="none"`. A geometric circle (or a
    // nested viewport, whose aspect handling runs in the stretched user space)
    // renders as an ellipse; only a screen-space stroke does not.
    render(chart(RISING));
    const dot = screen.getByTestId("TokenPriceChart__end-dot");
    expect(dot.tagName).toBe("path");
    expect(dot.getAttribute("vector-effect")).toBe("non-scaling-stroke");
    expect(dot.getAttribute("stroke-linecap")).toBe("round");
    expect(dot.getAttribute("stroke-width")).toBe("6");
    expect(
      screen.getByTestId("TokenPriceChart__svg").querySelector("circle"),
    ).toBeNull();
    // Series end at x=320 and the dot reaches 323; inline svg clips by default.
    expect(
      screen.getByTestId("TokenPriceChart__svg").getAttribute("overflow"),
    ).toBe("visible");
  });

  it("resumes from the displayed shape when interrupted mid-morph", () => {
    const { rerender } = render(chart(RISING));
    rerender(chart(VALLEY));
    flushFrame(0);
    flushFrame(CHART_MORPH_DURATION_MS / 2);
    expect(getPolylinePoints()).toBe("0,23.5 160,124.25 320,8");

    // A third range is chosen before the morph finishes. The next morph picks
    // up the shape actually on screen — it never snaps back to RISING and
    // re-animates.
    rerender(chart(FALLING));
    flushFrame(400);
    expect(getPolylinePoints()).toBe("0,23.5 320,8");
    expect(getPolylinePoints()).not.toBe("0,132 320,8");

    flushFrame(400 + CHART_MORPH_DURATION_MS);
    expect(getPolylinePoints()).toBe("0,8 320,132");
  });

  it("renders the settled geometry immediately when reduced motion is on", () => {
    setPrefersReducedMotion(true);

    const { rerender } = render(chart(RISING));
    rerender(chart(VALLEY));

    // The hard switch is the correct behaviour here, not a degraded one.
    expect(getPolylinePoints()).toBe("0,8 160,132 320,8");
    expect(pendingFrames.size).toBe(0);
  });

  it("does not morph into a series with no line to draw", () => {
    const { rerender } = render(chart(RISING));
    rerender(chart([{ t: 0, p: "1.00" }]));

    expect(getPolylinePoints()).toBe("0,70");
    expect(pendingFrames.size).toBe(0);
  });

  it("cancels its in-flight frame on unmount", () => {
    const { rerender, unmount } = render(chart(RISING));
    rerender(chart(VALLEY));
    flushFrame(0);
    expect(pendingFrames.size).toBe(1);

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
    expect(pendingFrames.size).toBe(0);
  });

  it("cancels the previous morph's frame when a new one starts", () => {
    const { rerender } = render(chart(RISING));
    rerender(chart(VALLEY));
    flushFrame(0);

    rerender(chart(FALLING));

    // Exactly one frame is ever outstanding, so rapid tapping cannot leave a
    // stack of morphs fighting over the same line.
    expect(cancelSpy).toHaveBeenCalled();
    expect(pendingFrames.size).toBe(1);
  });

  it("closes the fill under the real endpoints when the clamp collapses the x range", () => {
    // Both timestamps are in the future, so the clock-skew clamp pins both
    // to `now` and the whole series sits at one x. A fill closed at the
    // viewBox edges would then draw a diagonal to x=320 unrelated to the data.
    render(
      <LineChart
        points={[
          { t: 50000, p: "1.00" },
          { t: 60000, p: "1.10" },
        ]}
        resolutionSeconds={900}
        nowSeconds={20000}
        direction={PriceDirection.Positive}
        label="Price chart"
      />,
    );

    const fill =
      screen.getByTestId("TokenPriceChart__fill").getAttribute("points") || "";
    const xs = fill
      .trim()
      .split(/\s+/)
      .map((pt) => Number(pt.split(",")[0]));
    expect(new Set(xs).size).toBe(1);
  });
});
