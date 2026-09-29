import React from "react";
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import { ApiTokenPriceHistoryPoint } from "@shared/api/types";
import {
  installPointerEventPolyfill,
  mockChartRect,
} from "popup/__testHelpers__/pointerEvents";
import { LineChart, getPlottedRangeEnd } from "../LineChart";
import {
  CHART_MORPH_DURATION_MS,
  CHART_VIEWBOX_WIDTH,
  PriceDirection,
} from "../constants";

// jest-fixed-jsdom has no PointerEvent; without this, fireEvent.pointerDown/
// pointerMove below would silently drop clientX/pointerId. Installed once at
// module scope, before any render.
installPointerEventPolyfill();

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

describe("drag to inspect", () => {
  // bucket ends 900, 1800, 2700, 3600 → x 0, 106.67, 213.33, 320
  const points = [
    { t: 0, p: "1.00" },
    { t: 900, p: "1.10" },
    { t: 1800, p: "1.05" },
    { t: 2700, p: "1.20" },
  ];
  const renderInspectable = (
    props: Partial<React.ComponentProps<typeof LineChart>> = {},
  ) =>
    render(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={20000}
        direction={PriceDirection.Positive}
        label="Price chart"
        {...props}
      />,
    );

  beforeEach(() => {
    mockChartRect();
  });
  afterEach(() => jest.restoreAllMocks());

  it("pointerdown reports the snapped index (viewBox space, not client px), moves report on every pointermove, up ends", () => {
    const onInspectStart = jest.fn();
    const onInspectMove = jest.fn();
    const onInspectEnd = jest.fn();
    const { rerender } = renderInspectable({
      onInspectStart,
      onInspectMove,
      onInspectEnd,
    });
    const svg = screen.getByTestId("TokenPriceChart__svg");

    // 640px wide element → clientX 200 is viewBox x 100 → nearest 106.67 → index 1
    fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });
    expect(onInspectStart).toHaveBeenCalledWith(1);

    rerender(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={20000}
        direction={PriceDirection.Positive}
        label="Price chart"
        inspectedIndex={1}
        onInspectStart={onInspectStart}
        onInspectMove={onInspectMove}
        onInspectEnd={onInspectEnd}
      />,
    );
    fireEvent.pointerMove(svg, { clientX: 640, pointerId: 1 });
    expect(onInspectMove).toHaveBeenCalledWith(3);
    fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(onInspectEnd).toHaveBeenCalledTimes(1);
  });

  it("ignores pointermove while idle", () => {
    const onInspectMove = jest.fn();
    renderInspectable({ onInspectMove });
    fireEvent.pointerMove(screen.getByTestId("TokenPriceChart__svg"), {
      clientX: 100,
      pointerId: 1,
    });
    expect(onInspectMove).not.toHaveBeenCalled();
  });

  it("does not prevent the pointerdown default, so the compatibility mousedown still fires", () => {
    // Click-outside handlers and the activity ping listen for `mousedown`;
    // preventing pointerdown would suppress it.
    renderInspectable({ onInspectStart: jest.fn() });
    const svg = screen.getByTestId("TokenPriceChart__svg");
    const event = createEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });
    fireEvent(svg, event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("treats a move under the tap threshold as a tap, not a drag", () => {
    const onInspectMove = jest.fn();
    renderInspectable({ onInspectStart: jest.fn(), onInspectMove });
    const svg = screen.getByTestId("TokenPriceChart__svg");
    fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 202, pointerId: 1 });
    expect(onInspectMove).not.toHaveBeenCalled();
  });

  it("reports a move once it crosses the tap threshold, and every move after", () => {
    const onInspectMove = jest.fn();
    renderInspectable({ onInspectStart: jest.fn(), onInspectMove });
    const svg = screen.getByTestId("TokenPriceChart__svg");
    fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 205, pointerId: 1 });
    expect(onInspectMove).toHaveBeenCalledTimes(1);
    // Back inside the threshold of the press: still a drag.
    fireEvent.pointerMove(svg, { clientX: 201, pointerId: 1 });
    expect(onInspectMove).toHaveBeenCalledTimes(2);
  });

  it("captures the pointer, so moves keep arriving once it leaves the svg", () => {
    // jsdom has no pointer capture at all; define it for this test only, or
    // the component's `typeof … === "function"` guard skips it silently.
    const setPointerCapture = jest.fn();
    (
      SVGElement.prototype as unknown as { setPointerCapture: jest.Mock }
    ).setPointerCapture = setPointerCapture;

    try {
      renderInspectable({ onInspectStart: jest.fn() });
      fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
        clientX: 200,
        pointerId: 7,
      });

      expect(setPointerCapture).toHaveBeenCalledWith(7);
    } finally {
      delete (SVGElement.prototype as unknown as Record<string, unknown>)
        .setPointerCapture;
    }
  });

  it("ignores a second pointer while one is already inspecting", () => {
    // A second finger (or a pen landing beside a thumb) must not restart the
    // activation — that would emit a second `brushed` — and releasing it must
    // not end a drag it never owned.
    const onInspectStart = jest.fn();
    const onInspectMove = jest.fn();
    const onInspectEnd = jest.fn();
    renderInspectable({ onInspectStart, onInspectMove, onInspectEnd });
    const svg = screen.getByTestId("TokenPriceChart__svg");

    fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });
    expect(onInspectStart).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(svg, { clientX: 640, pointerId: 2 });
    expect(onInspectStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(svg, { pointerId: 2 });
    expect(onInspectEnd).not.toHaveBeenCalled();

    // The first pointer still owns the drag, and its release still ends it.
    fireEvent.pointerMove(svg, { clientX: 640, pointerId: 1 });
    expect(onInspectMove).toHaveBeenCalledWith(3);
    fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(onInspectEnd).toHaveBeenCalledTimes(1);
  });

  it("a non-primary-button press neither arms nor locks the inspection", () => {
    const setPointerCapture = jest.fn();
    (
      SVGElement.prototype as unknown as { setPointerCapture: jest.Mock }
    ).setPointerCapture = setPointerCapture;

    try {
      const onInspectStart = jest.fn();
      renderInspectable({ onInspectStart });
      const svg = screen.getByTestId("TokenPriceChart__svg");

      fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1, button: 2 });
      expect(onInspectStart).not.toHaveBeenCalled();
      expect(setPointerCapture).not.toHaveBeenCalled();

      // A right-click that armed would hold the lock, so this would be ignored.
      fireEvent.pointerDown(svg, { clientX: 200, pointerId: 2, button: 0 });
      expect(onInspectStart).toHaveBeenCalledWith(1);
      expect(setPointerCapture).toHaveBeenCalledWith(2);
    } finally {
      delete (SVGElement.prototype as unknown as Record<string, unknown>)
        .setPointerCapture;
    }
  });

  it("unmounting mid-drag ends the inspection exactly once", () => {
    const onInspectEnd = jest.fn();
    const { unmount } = renderInspectable({
      onInspectStart: jest.fn(),
      onInspectEnd,
    });
    fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
      clientX: 200,
      pointerId: 1,
    });

    unmount();

    expect(onInspectEnd).toHaveBeenCalledTimes(1);
  });

  it("unmounting after a release does not end the inspection again", () => {
    const onInspectEnd = jest.fn();
    const { unmount } = renderInspectable({
      onInspectStart: jest.fn(),
      onInspectEnd,
    });
    const svg = screen.getByTestId("TokenPriceChart__svg");
    fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(svg, { pointerId: 1 });

    unmount();

    expect(onInspectEnd).toHaveBeenCalledTimes(1);
  });

  it("keeps reporting moves after the parent clears the inspected index", () => {
    // A series change mid-drag (a range switch, a refetch landing) makes the
    // parent drop the index. The drag is still under the finger, so the next
    // move has to re-snap into the new series rather than going dead.
    const onInspectMove = jest.fn();
    const { rerender } = renderInspectable({
      onInspectStart: jest.fn(),
      onInspectMove,
      inspectedIndex: 1,
    });
    const svg = screen.getByTestId("TokenPriceChart__svg");
    fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });

    rerender(
      <LineChart
        points={points}
        resolutionSeconds={900}
        nowSeconds={20000}
        direction={PriceDirection.Positive}
        label="Price chart"
        inspectedIndex={null}
        onInspectStart={jest.fn()}
        onInspectMove={onInspectMove}
      />,
    );
    fireEvent.pointerMove(svg, { clientX: 640, pointerId: 1 });

    expect(onInspectMove).toHaveBeenCalledWith(3);
  });

  it("lostpointercapture ends the inspection", () => {
    // The browser can take capture away mid-drag (a context menu, a claimed
    // scroll). Without this the pointer is gone and the inspection would stay
    // frozen on screen.
    const onInspectEnd = jest.fn();
    renderInspectable({ onInspectStart: jest.fn(), onInspectEnd });
    const svg = screen.getByTestId("TokenPriceChart__svg");
    fireEvent.pointerDown(svg, { clientX: 200, pointerId: 1 });
    fireEvent.lostPointerCapture(svg, { pointerId: 1 });
    expect(onInspectEnd).toHaveBeenCalledTimes(1);
  });

  it("pointercancel ends the inspection", () => {
    const onInspectEnd = jest.fn();
    renderInspectable({ inspectedIndex: 1, onInspectEnd });
    fireEvent.pointerCancel(screen.getByTestId("TokenPriceChart__svg"), {
      pointerId: 1,
    });
    expect(onInspectEnd).toHaveBeenCalledTimes(1);
  });

  it("draws the guide and dot at the inspected point and hides the end dot", () => {
    renderInspectable({ inspectedIndex: 1 });
    const guide = screen.getByTestId("TokenPriceChart__inspect-guide");
    expect(Number(guide.getAttribute("x1"))).toBeCloseTo(106.67, 1);
    expect(guide.getAttribute("stroke-dasharray")).toBe("4 4");
    // Figma's 8px inspected dot, inside a 2px background ring — larger than
    // the 6px end dot it replaces.
    expect(
      screen
        .getByTestId("TokenPriceChart__inspect-dot")
        .getAttribute("stroke-width"),
    ).toBe("8");
    expect(
      screen
        .getByTestId("TokenPriceChart__svg")
        .querySelector(".LineChart__inspect-ring")
        ?.getAttribute("stroke-width"),
    ).toBe("12");
    expect(screen.queryByTestId("TokenPriceChart__end-dot")).toBeNull();
  });

  it("draws nothing extra when idle", () => {
    renderInspectable();
    expect(screen.queryByTestId("TokenPriceChart__inspect-guide")).toBeNull();
    expect(screen.getByTestId("TokenPriceChart__end-dot")).toBeInTheDocument();
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
    // First load, or arriving from the loading ghost / empty / error state:
    // the component mounts fresh, so there is no previous line on screen and
    // no tween to run.
    render(chart(VALLEY));

    expect(getPolylinePoints()).toBe("0,8 160,132 320,8");
    expect(pendingFrames.size).toBe(0);
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
