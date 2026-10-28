import React from "react";
import { Provider } from "react-redux";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import {
  densePoints,
  makeHistory,
} from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  installPointerEventPolyfill,
  mockChartRect,
} from "popup/__testHelpers__/pointerEvents";
import { resetCacheWriteClaims } from "helpers/cacheWrites";
import { emitMetric } from "helpers/metrics";
import {
  RangeDeltaState,
  TokenPriceChart,
} from "popup/components/account/TokenPriceChart";
import {
  CHART_HEIGHT_PX,
  CHART_MORPH_DURATION_MS,
  CHART_VIEWBOX_HEIGHT,
  RANGE_SWITCH_DEBOUNCE_MS,
  PriceDirection,
} from "popup/components/account/TokenPriceChart/constants";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

// jest-fixed-jsdom has no PointerEvent; without this, fireEvent.pointerDown/
// pointerMove/pointerUp below would silently drop clientX/pointerId.
installPointerEventPolyfill();

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));
const mockedEmitMetric = emitMetric as jest.Mock;
const brushedCalls = () =>
  mockedEmitMetric.mock.calls.filter(
    ([event]) => event === "token_chart.brushed",
  );

// 97 points — a full 1D series, comfortably past the sparse threshold.
const HISTORY_1D = makeHistory({ points: densePoints(97) });

const HISTORY_1W = makeHistory({
  range: "1W",
  resolutionSeconds: 3600,
  change: { absolute: "0.020000", percent: "12.50" },
  points: densePoints(169, {
    startT: 1786000000,
    stepSeconds: 3600,
    startPrice: 0.16,
  }),
});

const EMPTY_1H = makeHistory({
  range: "1H",
  resolutionSeconds: 300,
  lowVolume: null,
  change: null,
  points: [],
});

// A losing day: the Figma's `-$0.0602 (12.12%)` frame. Points fall so the
// series matches the sign of its `change`.
const HISTORY_1D_NEGATIVE = makeHistory({
  change: { absolute: "-0.060200", percent: "-12.12" },
  points: densePoints(97, { startPrice: 0.26, priceStep: -0.001 }),
});

const respondByRange = (byRange: Record<string, unknown>) => {
  mockedSend.mockImplementation(({ path }: { path: string }) => {
    const match = /range=([A-Z0-9]+)/.exec(path);
    const range = match ? match[1] : "";
    // A range the test says nothing about never answers. The deferred warm
    // pass (see warmRanges.test.tsx) walks the ranges in WARM_ORDER and
    // waits for each, so an unstubbed range parks the queue there rather than
    // quietly caching ranges a test's premise needs uncached.
    if (!(range in byRange)) {
      return new Promise(() => {});
    }
    return Promise.resolve({ status: 200, body: { data: byRange[range] } });
  });
};

/** Requests issued for one range. Warming means the total call count is no
 * longer a proxy for "did this switch go to the network" — the range is. */
const requestCountForRange = (range: string) =>
  mockedSend.mock.calls.filter(([{ path }]) => path.includes(`range=${range}`))
    .length;

// The section no longer draws a delta: it reports the selected range's one to
// the detail header, which renders it under the price. These tests assert the
// reported value — the same object `AssetDetail` puts on screen.
let reportedDelta: RangeDeltaState | null = null;
let reportCount = 0;
const deltaText = () => reportedDelta?.text ?? "";
// The chart's artwork colour: the direction class on the SVG root, which
// `currentColor` carries to the polyline, the gradient fill and the end dot.
const chartClass = () =>
  screen.getByTestId("TokenPriceChart__svg").getAttribute("class") ?? "";
// Stable, like the `useState` setter the detail view passes: the report is an
// effect dependency, so a fresh closure per render would refire it per render.
const handleDelta = (delta: RangeDeltaState) => {
  reportedDelta = delta;
  reportCount += 1;
};

const renderChart = () => {
  const store = makeDummyStore({});
  return render(
    <Provider store={store}>
      <TokenPriceChart
        token="native"
        networkDetails={MAINNET_NETWORK_DETAILS}
        fallback24hPercent="1.09"
        onDeltaChange={handleDelta}
      />
    </Provider>,
  );
};

describe("TokenPriceChart", () => {
  beforeEach(() => {
    reportedDelta = null;
    reportCount = 0;
    mockedEmitMetric.mockClear();
  });

  afterEach(() => {
    mockedSend.mockReset();
    jest.useRealTimers();
    resetCacheWriteClaims();
  });

  it("puts each price label over the point it describes", async () => {
    // A series that peaks EARLY: pinned to fixed corners the high label lands
    // above the low point, which reads as a mislabelled chart.
    respondByRange({
      "1D": {
        ...HISTORY_1D,
        points: [
          { t: 1786636800, p: "1.14" },
          { t: 1786637700, p: "1.15" },
          { t: 1786638600, p: "1.145" },
          { t: 1786639500, p: "1.10" },
        ],
      },
    });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    const leftPercent = (testId: string) => {
      const span = screen
        .getByTestId(testId)
        .querySelector(".TokenPriceChart__axis-label-text") as HTMLElement;
      return parseFloat(span.style.left);
    };

    // High is the 2nd of 4 points (early); low is the last (far right).
    const high = leftPercent("TokenPriceChart__axis-high");
    const low = leftPercent("TokenPriceChart__axis-low");
    expect(high).toBeLessThan(50);
    expect(low).toBeGreaterThan(50);
    expect(high).toBeLessThan(low);
  });

  it("keeps an edge label inside the plot instead of hanging it half outside", async () => {
    // A monotonic series — a token that only climbed — puts one extreme at
    // x=0 and the other at the far edge. A constant translateX(-50%) there
    // leaves half of "$1.10" outside the popup, so the shift has to scale
    // with the position: none at the left edge, all of it at the right.
    respondByRange({
      "1D": {
        ...HISTORY_1D,
        points: [
          { t: 1786636800, p: "1.10" },
          { t: 1786637700, p: "1.20" },
          { t: 1786638600, p: "1.30" },
        ],
      },
    });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    const placement = (testId: string) => {
      const span = screen
        .getByTestId(testId)
        .querySelector(".TokenPriceChart__axis-label-text") as HTMLElement;
      return { left: span.style.left, transform: span.style.transform };
    };

    // Low is the first point (x = 0): flush left, no shift at all.
    expect(placement("TokenPriceChart__axis-low")).toEqual({
      left: "0%",
      transform: "translateX(-0%)",
    });
    // High is the last (x = the full width): shifted its entire width back,
    // so its right edge — not its centre — sits on the point.
    expect(placement("TokenPriceChart__axis-high")).toEqual({
      left: "100%",
      transform: "translateX(-100%)",
    });
  });

  it("keeps the price labels out of the plot, in rows above and below it", async () => {
    // Regression: the labels were absolute overlays inside the canvas, the low
    // one left-aligned — so a series whose minimum sat near the left edge ran
    // straight into "$0.1794" underneath it.
    respondByRange({ "1D": HISTORY_1D });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    const canvas = screen.getByTestId("TokenPriceChart__canvas");
    const high = screen.getByTestId("TokenPriceChart__axis-high");
    const low = screen.getByTestId("TokenPriceChart__axis-low");

    expect(canvas.contains(high)).toBe(false);
    expect(canvas.contains(low)).toBe(false);
    // Both carry a price, and the high row precedes the canvas while the low
    // row follows it.
    expect(high.textContent).toContain("$");
    expect(low.textContent).toContain("$");
    const plot = high.parentElement!;
    const order = Array.from(plot.children);
    expect(order.indexOf(high)).toBeLessThan(order.indexOf(canvas));
    expect(order.indexOf(low)).toBeGreaterThan(order.indexOf(canvas));
  });

  it("draws no delta of its own — the detail header owns the only one", async () => {
    respondByRange({ "1D": HISTORY_1D });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    expect(screen.queryByTestId("TokenPriceChart__delta")).toBeNull();
    const section = screen.getByTestId("TokenPriceChart");
    expect(section.textContent).not.toContain("%");
    expect(
      section.querySelectorAll(".TokenPriceChart__delta-ghost"),
    ).toHaveLength(0);
  });

  it("reports the per-range delta for the header", async () => {
    respondByRange({ "1D": HISTORY_1D });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    // Absolute + percent, sign in the text, never recomputed.
    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "+$0.0014 (0.86%)",
      colorClass: "positive",
      inspectedPrice: null,
    });
  });

  it("reports the delta only when it changes, not on every render", async () => {
    // The header holds the reported delta in state, so a report per render
    // would set that state per render and spin. A clean load has exactly two
    // states to report: loading, then the landed delta.
    respondByRange({ "1D": HISTORY_1D });
    const store = makeDummyStore({});
    const user = userEvent.setup();

    // Stands in for the detail view re-rendering around the section — which
    // is exactly what handling the report makes it do.
    const Harness = () => {
      const [, bump] = React.useState(0);
      return (
        <Provider store={store}>
          <button
            type="button"
            data-testid="bump"
            onClick={() => bump((n) => n + 1)}
          />
          <TokenPriceChart
            token="native"
            networkDetails={MAINNET_NETWORK_DETAILS}
            fallback24hPercent="1.09"
            onDeltaChange={handleDelta}
          />
        </Provider>
      );
    };
    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );
    expect(reportCount).toBe(2);

    await user.click(screen.getByTestId("bump"));
    await user.click(screen.getByTestId("bump"));
    expect(reportCount).toBe(2);
  });

  it("renders a tablist selector with all six ranges", async () => {
    respondByRange({ "1D": HISTORY_1D });
    renderChart();

    await waitFor(() =>
      expect(screen.getByRole("tablist")).toBeInTheDocument(),
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "1H",
      "1D",
      "1W",
      "1M",
      "1Y",
      "ALL",
    ]);
    expect(
      tabs.find((tab) => tab.getAttribute("aria-selected") === "true")
        ?.textContent,
    ).toBe("1D");
  });

  it("keeps the timeframe selector visible on a per-range empty result", async () => {
    jest.useFakeTimers();
    respondByRange({ "1D": HISTORY_1D, "1H": EMPTY_1H });
    renderChart();

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();

    // Switch to a range with no data.
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole("tab", { name: "1H" }));

    // The switch is debounced ~250ms before fetching.
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(screen.getByTestId("TokenPriceChart__empty")).toBeDefined();
    expect(screen.queryByTestId("TokenPriceChart__polyline")).toBeNull();
    // The selector never hides — a thin asset can have data on other ranges.
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("tab")
        .find((tab) => tab.getAttribute("aria-selected") === "true")
        ?.textContent,
    ).toBe("1H");
  });

  it("shows the loading ghost the instant an uncached range is selected", async () => {
    jest.useFakeTimers();
    respondByRange({ "1D": HISTORY_1D, "1W": HISTORY_1W });
    renderChart();

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();
    expect(screen.getByRole("img")).toBeDefined();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole("tab", { name: "1W" }));

    // Timers have NOT advanced: the fetch is still inside the 250ms debounce.
    // The 1W tab is already selected, so 1D's polyline and delta must be gone.
    // Rendering them here puts the previous range's data under the new range's
    // tab — and under a chart aria-label that names the new range.
    expect(
      screen
        .getAllByRole("tab")
        .find((tab) => tab.getAttribute("aria-selected") === "true")
        ?.textContent,
    ).toBe("1W");
    expect(screen.getByTestId("TokenPriceChart__loading")).toBeDefined();
    expect(screen.queryByTestId("TokenPriceChart__polyline")).toBeNull();
    // The header is told the delta is loading, so it draws its placeholder —
    // it must never be handed 1D's numbers under the 1W tab.
    expect(reportedDelta?.isLoading).toBe(true);
    expect(deltaText()).not.toMatch(/[$%\d]/);
    // No labelled chart image exists while its range's data is not displayed.
    expect(screen.queryByRole("img")).toBeNull();

    // The debounce still gates the network call, and 1W lands normally.
    await act(async () => {
      jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
      await Promise.resolve();
    });
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();
    expect(screen.getByRole("img")).toBeDefined();
    expect(deltaText()).toContain("12.50%");
  });

  it("renders a cached range immediately — no debounce, no request", async () => {
    jest.useFakeTimers();
    respondByRange({ "1D": HISTORY_1D, "1W": HISTORY_1W });
    renderChart();

    await act(async () => {
      await Promise.resolve();
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole("tab", { name: "1W" }));
    await act(async () => {
      jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
      await Promise.resolve();
    });
    expect(requestCountForRange("1W")).toBe(1);
    expect(deltaText()).toContain("12.50%");

    // Back to 1D, still inside the 5-minute session cache. The debounce exists
    // to coalesce network calls; a switch that makes none must not wait on it.
    await user.click(screen.getByRole("tab", { name: "1D" }));

    // Not a single timer advanced.
    expect(screen.queryByTestId("TokenPriceChart__loading")).toBeNull();
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();
    expect(deltaText()).toContain("0.86%");
    expect(requestCountForRange("1D")).toBe(1);

    // ...and the settled state after the window elapses is still the cached
    // range, with no request issued for it.
    await act(async () => {
      jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
      await Promise.resolve();
    });
    expect(requestCountForRange("1D")).toBe(1);
    expect(requestCountForRange("1W")).toBe(1);
    expect(deltaText()).toContain("0.86%");
  });

  it("rises out of the hairline after a fetch, and morphs on a cached switch", async () => {
    // The two halves of the morph contract, on the real switching path: a
    // cache hit tweens from the outgoing line, and a fetch shows the shimmer
    // and then lifts the new series out of the flat centre line where the
    // hairline sat — the previous range's line is never held under the new tab.
    jest.useFakeTimers();
    const pendingFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 0;
    const originalRaf = window.requestAnimationFrame;
    const originalCancelRaf = window.cancelAnimationFrame;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      nextFrameId += 1;
      pendingFrames.set(nextFrameId, callback);
      return nextFrameId;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => {
      pendingFrames.delete(id);
    }) as unknown as typeof window.cancelAnimationFrame;
    const flushFrame = (timestamp: number) => {
      const due = [...pendingFrames.values()];
      pendingFrames.clear();
      act(() => {
        due.forEach((callback) => callback(timestamp));
      });
    };
    const linePoints = () =>
      screen.getByTestId("TokenPriceChart__polyline").getAttribute("points");
    const isFlatAtCentre = (points: string | null) =>
      (points ?? "")
        .trim()
        .split(" ")
        .every(
          (pair) => Number(pair.split(",")[1]) === CHART_VIEWBOX_HEIGHT / 2,
        );

    try {
      respondByRange({ "1D": HISTORY_1D, "1W": HISTORY_1W });
      renderChart();
      await act(async () => {
        await Promise.resolve();
      });
      // First load, after the shimmer: flat at the centre, then rising.
      expect(isFlatAtCentre(linePoints())).toBe(true);
      expect(pendingFrames.size).toBe(1);
      flushFrame(0);
      flushFrame(CHART_MORPH_DURATION_MS);
      const points1D = linePoints();
      expect(isFlatAtCentre(points1D)).toBe(false);
      expect(pendingFrames.size).toBe(0);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Uncached: the chart drops to the ghost, so there is no line on screen
      // to morph from and nothing is scheduled.
      await user.click(screen.getByRole("tab", { name: "1W" }));
      expect(screen.queryByTestId("TokenPriceChart__polyline")).toBeNull();
      expect(pendingFrames.size).toBe(0);

      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
        await Promise.resolve();
      });
      expect(isFlatAtCentre(linePoints())).toBe(true);
      flushFrame(0);
      flushFrame(CHART_MORPH_DURATION_MS);
      const points1W = linePoints();
      expect(points1W).not.toBe(points1D);
      expect(isFlatAtCentre(points1W)).toBe(false);
      expect(pendingFrames.size).toBe(0);

      // Cached: no ghost, and the line is still the outgoing shape with a
      // morph scheduled rather than 1D's geometry already cut in.
      await user.click(screen.getByRole("tab", { name: "1D" }));
      expect(screen.queryByTestId("TokenPriceChart__loading")).toBeNull();
      expect(linePoints()).toBe(points1W);
      expect(pendingFrames.size).toBe(1);

      // Mid-morph: neither shape, at 1D's own x positions.
      flushFrame(0);
      expect(linePoints()).not.toBe(points1W);
      expect(linePoints()).not.toBe(points1D);

      // Settled: exactly the geometry the first 1D render drew.
      flushFrame(CHART_MORPH_DURATION_MS);
      expect(linePoints()).toBe(points1D);
      expect(pendingFrames.size).toBe(0);
    } finally {
      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCancelRaf;
    }
  });

  it("paints a cached open directly — it rises only out of a visible shimmer", async () => {
    respondByRange({ "1D": HISTORY_1D });
    const store = makeDummyStore({});
    const chart = (
      <Provider store={store}>
        <TokenPriceChart
          token="native"
          networkDetails={MAINNET_NETWORK_DETAILS}
          fallback24hPercent="1.09"
          onDeltaChange={handleDelta}
        />
      </Provider>
    );

    const first = render(chart);
    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__svg")).toHaveClass(
        "LineChart--rise",
      ),
    );
    first.unmount();

    render(chart);
    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__svg")).toBeInTheDocument(),
    );
    expect(requestCountForRange("1D")).toBe(1);
    expect(screen.getByTestId("TokenPriceChart__svg")).not.toHaveClass(
      "LineChart--rise",
    );
  });

  it("reports no delta for a one-point series, even when change is present", async () => {
    // The backend computes `change` from a single point; a signed delta above
    // "No price data for this period" would contradict the canvas.
    respondByRange({
      "1D": {
        ...HISTORY_1D,
        points: [HISTORY_1D.points[0]],
        change: { absolute: "0.020000", percent: "12.50" },
      },
    });
    renderChart();

    await waitFor(() =>
      expect(reportedDelta).toEqual({
        isLoading: false,
        text: "",
        colorClass: "neutral",
        inspectedPrice: null,
      }),
    );
    expect(screen.queryByTestId("TokenPriceChart__polyline")).toBeNull();
  });

  it("reports no delta when change is null with points present", async () => {
    respondByRange({
      "1D": { ...HISTORY_1D, change: null },
    });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    // Settled with nothing to show — not loading, so the header draws an
    // empty row rather than holding its placeholder forever.
    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "",
      colorClass: "neutral",
      inspectedPrice: null,
    });
    // No delta means no direction: the artwork is neutral, never coloured off
    // a series the payload declined to characterise.
    expect(chartClass()).toContain("LineChart--neutral");
  });

  it("shows the percentage alone when the dollar figure rounds to zero", async () => {
    // A sub-cent move on a cheap token: the percent is real, the formatted
    // absolute is not. Signing and colouring a "$0.00" off the percent renders
    // a green "+$0.00" that claims a gain the dollar figure denies.
    respondByRange({
      "1D": { ...HISTORY_1D, change: { absolute: "0", percent: "0.05" } },
    });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    // The percent keeps its own sign and colour.
    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "+0.05%",
      colorClass: "positive",
      inspectedPrice: null,
    });
  });

  // The three-state palette: the sign of `change.percent` colours the delta
  // text AND the chart artwork together, as the Figma draws them. This
  // supersedes the two-state rule the design doc's §B.2 still describes.
  it("renders a negative range red — delta and chart artwork together", async () => {
    respondByRange({ "1D": HISTORY_1D_NEGATIVE });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "-$0.0602 (12.12%)",
      colorClass: "negative",
      inspectedPrice: null,
    });
    // Colour never carries the meaning alone (§7.4): the sign stays in the
    // text.
    expect(deltaText().startsWith("-")).toBe(true);
    // ...and the chart is red too, not the green it used to draw under a
    // falling series.
    expect(chartClass()).toContain("LineChart--negative");
    expect(chartClass()).not.toContain("LineChart--positive");
  });

  it("keeps a positive range green — delta and chart artwork together", async () => {
    respondByRange({ "1D": HISTORY_1D });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    expect(reportedDelta?.colorClass).toBe("positive");
    expect(chartClass()).toContain("LineChart--positive");
  });

  // The backend rounds `change.percent` to two decimals so the 1D value equals
  // `percentagePriceChange24h` exactly (§D8), so a real-but-tiny move arrives
  // as `percent: "0"` with a live `absolute` — USDC over 1D. Direction falls
  // back to the absolute there, or the dollar figure says the price moved
  // while its sign, its colour and the line all say flat.
  it("signs a rising range off the absolute when the percent rounds to zero", async () => {
    respondByRange({
      "1D": {
        ...HISTORY_1D,
        change: { absolute: "0.000019827880302", percent: "0" },
      },
    });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    // The shape is unchanged — the sign is carried once, by the dollar term,
    // and the parenthesised percent stays magnitude-only.
    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "+$0.000020 (0.00%)",
      colorClass: "positive",
      inspectedPrice: null,
    });
    // One direction drives everything: the artwork takes the delta's, so this
    // token's chart is green rather than the grey it used to draw.
    expect(chartClass()).toContain("LineChart--positive");
    expect(chartClass()).not.toContain("LineChart--neutral");
  });

  it("signs a falling range off the absolute when the percent rounds to zero", async () => {
    respondByRange({
      "1D": {
        ...HISTORY_1D,
        change: { absolute: "-0.000019827880302", percent: "0" },
      },
    });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "-$0.000020 (0.00%)",
      colorClass: "negative",
      inspectedPrice: null,
    });
    expect(chartClass()).toContain("LineChart--negative");
    expect(chartClass()).not.toContain("LineChart--neutral");
  });

  it("renders a genuinely flat range as neutral with no sign", async () => {
    respondByRange({
      "1D": { ...HISTORY_1D, change: { absolute: "0", percent: "0" } },
    });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );

    // A flat range is neutral, never the `getPriceDeltaColor` "negative" the
    // rest of the popup would paint a zero — a zero move is not a loss, so
    // the three-state palette must not inherit that bug.
    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "0.00%",
      colorClass: "neutral",
      inspectedPrice: null,
    });
    expect(chartClass()).toContain("LineChart--neutral");
    expect(chartClass()).not.toContain("LineChart--negative");
  });

  describe("loading state", () => {
    // The fetch never settles, so the component stays in RequestState.LOADING.
    const renderLoading = () => {
      mockedSend.mockImplementation(() => new Promise(() => {}));
      return renderChart();
    };

    it("draws a hairline shimmer across the chart, centred, not a flat block", () => {
      renderLoading();

      const loading = screen.getByTestId("TokenPriceChart__loading");
      expect(loading.className).not.toContain("TokenPriceChart__skeleton");

      const line = screen.getByTestId("TokenPriceChart__shimmer");
      expect(line).toHaveClass("Shimmer", "Shimmer--hairline");
      expect(line.style.width).toBe("100%");
      expect(line.style.height).toBe("1px");
      expect(loading.contains(line)).toBe(true);
      expect(screen.queryByTestId("TokenPriceChart__ghost")).toBeNull();
    });

    it("keeps the timeframe selector crisp and interactive while loading", () => {
      renderLoading();

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(6);
      tabs.forEach((tab) => expect(tab).toBeEnabled());

      // The selector is a sibling of the loading layer, never inside it.
      expect(
        screen
          .getByTestId("TokenPriceChart__loading")
          .contains(screen.getByRole("tablist")),
      ).toBe(false);
    });

    it("holds the chart height while loading — no layout shift", async () => {
      const { unmount } = renderLoading();
      const loadingHeight = screen.getByTestId("TokenPriceChart__canvas").style
        .height;
      unmount();
      // The parked request would otherwise be joined by the remount (same
      // key, still "in flight"); a real one settles, this mock never does.
      resetCacheWriteClaims();

      respondByRange({ "1D": HISTORY_1D });
      renderChart();
      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );

      expect(loadingHeight).toBe(`${CHART_HEIGHT_PX}px`);
      expect(screen.getByTestId("TokenPriceChart__canvas").style.height).toBe(
        loadingHeight,
      );
    });

    it("keeps the same rows while loading so nothing below them shifts", async () => {
      // The section is a flex column, so a row that appears only once data
      // lands pushes the canvas AND the timeframe selector down with it. The
      // canvas holding its own height is not enough: every row above the
      // selector has to exist in both states.
      const { unmount } = renderLoading();
      const loadingRows = Array.from(
        screen.getByTestId("TokenPriceChart").children,
      ).map((child) => child.getAttribute("data-testid"));

      // The header is told to hold its placeholder, not a stale number.
      expect(reportedDelta).toEqual({
        isLoading: true,
        text: "",
        colorClass: "neutral",
        inspectedPrice: null,
      });
      unmount();
      resetCacheWriteClaims();

      respondByRange({ "1D": HISTORY_1D });
      renderChart();
      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );

      const loadedRows = Array.from(
        screen.getByTestId("TokenPriceChart").children,
      ).map((child) => child.getAttribute("data-testid"));

      expect(loadingRows).toEqual(loadedRows);
    });

    it("hides the shimmer from assistive tech and reports the chart busy", () => {
      renderLoading();

      expect(
        screen
          .getByTestId("TokenPriceChart__shimmer")
          .getAttribute("aria-hidden"),
      ).toBe("true");
      expect(
        screen.getByTestId("TokenPriceChart__canvas").getAttribute("aria-busy"),
      ).toBe("true");
      expect(
        screen.getByRole("status", { name: "Loading price chart" }),
      ).toBeInTheDocument();

      // A hairline shimmer is not a chart image — nothing announces as one.
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("clears aria-busy once the series lands", async () => {
      respondByRange({ "1D": HISTORY_1D });
      renderChart();

      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );
      expect(
        screen.getByTestId("TokenPriceChart__canvas").getAttribute("aria-busy"),
      ).toBe("false");
      // The loading region unmounts. The notice's own `role="status"` region
      // stays mounted and empty — see the live-region test above.
      expect(
        screen.queryByRole("status", { name: "Loading price chart" }),
      ).toBeNull();
    });

    it("renders no price text at all while loading", () => {
      renderLoading();

      // A wallet must never draw invented prices while loading: no axis
      // labels, no delta, no currency anywhere in the section.
      const section = screen.getByTestId("TokenPriceChart");
      expect(section.textContent).not.toContain("$");
      // The label rows still exist — they hold the section's height across
      // states — but carry no text until a series lands.
      expect(screen.getByTestId("TokenPriceChart__axis-high").textContent).toBe(
        "",
      );
      expect(screen.getByTestId("TokenPriceChart__axis-low").textContent).toBe(
        "",
      );
      // ...and nothing numeric is handed to the header either.
      expect(deltaText()).not.toMatch(/[$%\d]/);
    });
  });

  it("falls back to the 24h delta on a 1D fetch error", async () => {
    mockedSend.mockResolvedValue({ status: 503, body: { error: "down" } });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__empty")).toBeDefined(),
    );

    // Percent only: the absolute must never be derived from the percentage.
    expect(reportedDelta).toEqual({
      isLoading: false,
      text: "+1.09%",
      colorClass: "positive",
      inspectedPrice: null,
    });
  });

  it("reports no number when a range other than 1D fails", async () => {
    jest.useFakeTimers();
    mockedSend.mockImplementation(({ path }: { path: string }) =>
      path.includes("range=1D")
        ? Promise.resolve({ status: 200, body: { data: HISTORY_1D } })
        : Promise.resolve({ status: 503, body: { error: "down" } }),
    );
    renderChart();

    await act(async () => {
      await Promise.resolve();
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole("tab", { name: "1Y" }));
    await act(async () => {
      jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    // A 24h figure under a 1Y selector is the wrong timeframe, so no number
    // is shown at all.
    expect(deltaText()).toBe("");
    expect(deltaText()).not.toContain("1.09");
  });

  it("announces the reliability notice through a live region outside the busy panel", async () => {
    // The notice is inserted after the fetch settles. It sits outside the
    // `aria-busy` canvas, so with no live region a screen-reader user resting
    // on the timeframe selector is never told the price data is unreliable.
    respondByRange({
      "1D": makeHistory({ points: densePoints(97), lowVolume: true }),
    });
    renderChart();

    // The region is in the DOM from the first render — before there is
    // anything to announce — so the insertion is a content change, not a
    // region that appears together with its own text.
    const region = screen.getByTestId("TokenPriceChart__notice");
    expect(region.getAttribute("role")).toBe("status");
    expect(region.children).toHaveLength(0);

    await waitFor(() =>
      expect(screen.getByTestId("TokenChartNotice")).toBeDefined(),
    );
    expect(region.contains(screen.getByTestId("TokenChartNotice"))).toBe(true);
    // Not nested in the panel `aria-busy` is applied to: AT defers a busy
    // region's announcements.
    expect(screen.getByTestId("TokenPriceChart__canvas").contains(region)).toBe(
      false,
    );
  });

  describe("drag to inspect", () => {
    // 3 evenly-spaced buckets → bucket ends 900, 1800, 2700 → viewBox x 0,
    // 160, 320 (§ getChartCoordinates), independent of `resolutionSeconds`.
    const INSPECTABLE_HISTORY = makeHistory({
      points: [
        { t: 0, p: "0.20" },
        { t: 900, p: "0.22" },
        { t: 1800, p: "0.26" },
      ],
      resolutionSeconds: 900,
      change: { absolute: "0.06", percent: "30.00" },
    });

    afterEach(() => jest.restoreAllMocks());

    it("while inspecting, reports the inspected price and the close-to-close delta, then reverts on release", async () => {
      respondByRange({ "1D": INSPECTABLE_HISTORY });
      renderChart();

      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );

      mockChartRect();
      const svg = screen.getByTestId("TokenPriceChart__svg");

      // 640px-wide element → clientX 320 is viewBox x 160 → nearest is index 1
      // (x=160) exactly.
      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(reportedDelta).toEqual({
        isLoading: false,
        text: "+$0.02 (10.00%)",
        colorClass: PriceDirection.Positive,
        inspectedPrice: "0.22",
      });

      fireEvent.pointerUp(svg, { pointerType: "touch", pointerId: 1 });
      expect(reportedDelta).toEqual({
        isLoading: false,
        text: "+$0.06 (30.00%)",
        colorClass: PriceDirection.Positive,
        inspectedPrice: null,
      });
    });

    it("while inspecting, the high row shows the point's timestamp instead of the price labels", async () => {
      respondByRange({ "1D": INSPECTABLE_HISTORY });
      renderChart();

      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );
      const highRow = screen.getByTestId("TokenPriceChart__axis-high");
      const lowRow = screen.getByTestId("TokenPriceChart__axis-low");
      expect(highRow).toHaveTextContent("$0.26");
      expect(lowRow).toHaveTextContent("$0.20");

      mockChartRect();
      const svg = screen.getByTestId("TokenPriceChart__svg");
      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });

      expect(
        screen.queryByTestId("TokenPriceChart__inspect-tooltip"),
      ).toBeNull();
      const timestamp = screen.getByTestId(
        "TokenPriceChart__inspect-timestamp",
      );
      expect(highRow.contains(timestamp)).toBe(true);
      expect(highRow).not.toHaveTextContent("$0.26");
      expect(lowRow.textContent).toBe("");
      // Index 1 plots at x=160, the middle of the 320-wide viewBox.
      expect(timestamp.style.left).toBe("50%");
      expect(timestamp.style.transform).toBe("translateX(-50%)");

      fireEvent.pointerUp(svg, { pointerType: "touch", pointerId: 1 });
      expect(
        screen.queryByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeNull();
      expect(highRow).toHaveTextContent("$0.26");
      expect(lowRow).toHaveTextContent("$0.20");
    });

    it("the chart colour stays the RANGE's direction while inspecting a point below the open", async () => {
      // Rising overall (0.20 → 0.30, range change positive) but the middle
      // point dips below the open — the inspected delta from it is negative.
      respondByRange({
        "1D": makeHistory({
          points: [
            { t: 0, p: "0.20" },
            { t: 900, p: "0.18" },
            { t: 1800, p: "0.30" },
          ],
          resolutionSeconds: 900,
          change: { absolute: "0.10", percent: "50.00" },
        }),
      });
      renderChart();

      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );
      expect(chartClass()).toContain("LineChart--positive");

      mockChartRect();
      fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });

      // The delta TEXT follows the inspected (negative) change...
      expect(reportedDelta?.colorClass).toBe(PriceDirection.Negative);
      // ...but the ARTWORK keeps the range's (positive) direction.
      expect(chartClass()).toContain("LineChart--positive");
      expect(chartClass()).not.toContain("LineChart--negative");
    });

    it("fires token_chart.brushed on the first MOVE of an activation, not on the click", async () => {
      respondByRange({ "1D": INSPECTABLE_HISTORY });
      renderChart();

      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );

      mockChartRect();
      const svg = screen.getByTestId("TokenPriceChart__svg");

      // Pointerdown alone: the artwork, the timestamp and the reported price all
      // follow it, but nothing is reported to analytics — a tap is not a drag.
      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(
        screen.getByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeDefined();
      expect(reportedDelta?.inspectedPrice).toBe("0.22");
      expect(brushedCalls()).toHaveLength(0);

      fireEvent.pointerMove(svg, {
        pointerType: "touch",
        clientX: 640,
        pointerId: 1,
      });
      expect(brushedCalls()).toEqual([
        ["token_chart.brushed", { range: "1D" }],
      ]);

      // Still exactly one for the rest of the activation.
      fireEvent.pointerMove(svg, {
        pointerType: "touch",
        clientX: 0,
        pointerId: 1,
      });
      fireEvent.pointerUp(svg, { pointerType: "touch", pointerId: 1 });
      expect(brushedCalls()).toHaveLength(1);
    });

    it("a bare click emits nothing, and two drags emit two brushed events", async () => {
      respondByRange({ "1D": INSPECTABLE_HISTORY });
      renderChart();

      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );

      mockChartRect();
      const svg = screen.getByTestId("TokenPriceChart__svg");

      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      fireEvent.pointerUp(svg, { pointerType: "touch", pointerId: 1 });
      expect(brushedCalls()).toHaveLength(0);

      const drag = (pointerId: number) => {
        fireEvent.pointerDown(svg, {
          pointerType: "touch",
          clientX: 0,
          pointerId,
        });
        fireEvent.pointerMove(svg, {
          pointerType: "touch",
          clientX: 320,
          pointerId,
        });
        fireEvent.pointerMove(svg, {
          pointerType: "touch",
          clientX: 640,
          pointerId,
        });
        fireEvent.pointerUp(svg, { pointerType: "touch", pointerId });
      };
      drag(2);
      drag(3);

      // Per ACTIVATION, so a second drag is a second event — the ref is reset
      // at both ends of an activation, not once per mount.
      expect(brushedCalls()).toEqual([
        ["token_chart.brushed", { range: "1D" }],
        ["token_chart.brushed", { range: "1D" }],
      ]);
    });

    it("a move that snaps to the already-inspected index does not re-render", async () => {
      respondByRange({ "1D": INSPECTABLE_HISTORY });
      const onRender = jest.fn();
      render(
        <React.Profiler id="chart" onRender={onRender}>
          <Provider store={makeDummyStore({})}>
            <TokenPriceChart
              token="native"
              networkDetails={MAINNET_NETWORK_DETAILS}
              fallback24hPercent="1.09"
              onDeltaChange={handleDelta}
            />
          </Provider>
        </React.Profiler>,
      );
      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );

      mockChartRect();
      const svg = screen.getByTestId("TokenPriceChart__svg");
      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 0,
        pointerId: 1,
      });
      fireEvent.pointerMove(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(reportedDelta?.inspectedPrice).toBe("0.22");
      const commits = onRender.mock.calls.length;

      // All still nearest index 1 (x=160). React may render once more before
      // its eager bailout engages; a fresh object per move commits every time.
      fireEvent.pointerMove(svg, {
        pointerType: "touch",
        clientX: 330,
        pointerId: 1,
      });
      fireEvent.pointerMove(svg, {
        pointerType: "touch",
        clientX: 310,
        pointerId: 1,
      });
      fireEvent.pointerMove(svg, {
        pointerType: "touch",
        clientX: 325,
        pointerId: 1,
      });

      expect(onRender.mock.calls.length).toBeLessThanOrEqual(commits + 1);
    });

    it("unmounting mid-drag tears down cleanly", async () => {
      // The pointer is still down and captured when the section goes away (a
      // kill-switch flip, a back navigation). Nothing may set state on the
      // unmounted tree, and the last thing the parent heard must not be left
      // standing as the header's price — see AssetDetail's own test for the
      // other half of that.
      respondByRange({ "1D": INSPECTABLE_HISTORY });
      const { unmount } = renderChart();

      await waitFor(() =>
        expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
      );

      mockChartRect();
      const svg = screen.getByTestId("TokenPriceChart__svg");
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      fireEvent.pointerMove(svg, {
        pointerType: "touch",
        clientX: 640,
        pointerId: 1,
      });
      expect(reportedDelta?.inspectedPrice).toBe("0.26");

      unmount();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      // The section cannot report a release it is no longer mounted for: the
      // last report it made still carries the inspected price, which is why
      // the detail view resets its own copy when the chart goes away.
      expect(reportedDelta?.inspectedPrice).toBe("0.26");
    });

    it("a range switch clears the inspection", async () => {
      jest.useFakeTimers();
      respondByRange({ "1D": INSPECTABLE_HISTORY, "1W": HISTORY_1W });
      renderChart();

      await act(async () => {
        await Promise.resolve();
      });

      mockChartRect();
      fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(
        screen.getByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeDefined();

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(screen.getByRole("tab", { name: "1W" }));
      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
        await Promise.resolve();
      });

      expect(
        screen.queryByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeNull();
      expect(reportedDelta).toEqual(
        expect.objectContaining({ inspectedPrice: null }),
      );
    });

    it("an uncached switch mid-drag drops the inspection through the skeleton and after returning", async () => {
      jest.useFakeTimers();
      respondByRange({ "1D": INSPECTABLE_HISTORY, "1W": HISTORY_1W });
      renderChart();
      await act(async () => {
        await Promise.resolve();
      });

      mockChartRect();
      fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(reportedDelta?.inspectedPrice).toBe("0.22");

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(screen.getByRole("tab", { name: "1W" }));
      expect(
        screen.getByTestId("TokenPriceChart__loading"),
      ).toBeInTheDocument();
      expect(reportedDelta).toEqual(
        expect.objectContaining({ isLoading: true, inspectedPrice: null }),
      );

      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
        await Promise.resolve();
      });
      expect(screen.getByTestId("TokenPriceChart__svg")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "1D" }));
      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS);
        await Promise.resolve();
      });

      expect(requestCountForRange("1D")).toBe(1);
      expect(
        screen.queryByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeNull();
      expect(reportedDelta).toEqual(
        expect.objectContaining({ inspectedPrice: null }),
      );
    });

    it("a cached range switch clears the inspection while the chart stays mounted", async () => {
      // A cached switch never shows the loading ghost, so only the series
      // identity guard can drop the index snapped against the old series.
      jest.useFakeTimers();
      respondByRange({ "1D": INSPECTABLE_HISTORY, "1W": HISTORY_1W });
      renderChart();
      await act(async () => {
        await Promise.resolve();
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(screen.getByRole("tab", { name: "1W" }));
      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
        await Promise.resolve();
      });

      mockChartRect();
      // Index 0, which also exists in the 3-point 1D series: an index past its
      // end would null out without the guard ever being consulted.
      fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
        pointerType: "touch",
        clientX: 0,
        pointerId: 1,
      });
      expect(
        screen.getByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeDefined();

      await user.click(screen.getByRole("tab", { name: "1D" }));
      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS);
        await Promise.resolve();
      });

      expect(requestCountForRange("1D")).toBe(1);
      expect(screen.getByTestId("TokenPriceChart__svg")).toBeInTheDocument();
      expect(screen.queryByTestId("TokenPriceChart__loading")).toBeNull();
      expect(
        screen.queryByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeNull();
      expect(reportedDelta).toEqual(
        expect.objectContaining({ inspectedPrice: null }),
      );
    });

    it("ends the inspection the instant another cached range is selected, before the debounce lands", async () => {
      jest.useFakeTimers();
      respondByRange({ "1D": INSPECTABLE_HISTORY, "1W": HISTORY_1W });
      renderChart();
      await act(async () => {
        await Promise.resolve();
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(screen.getByRole("tab", { name: "1W" }));
      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
        await Promise.resolve();
      });

      mockChartRect();
      fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
        pointerType: "touch",
        clientX: 0,
        pointerId: 1,
      });
      expect(
        screen.getByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeDefined();

      // A raw, un-`act`-wrapped dispatch: this commits the `selectedRange`
      // change on its own, one microtask ahead of the passive effect that
      // re-fetches (even a cache hit) and swaps `chartHistory` — the one
      // render where a range-unaware guard would still show the old point.
      screen
        .getByRole("tab", { name: "1D" })
        .dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
      await Promise.resolve();

      expect(screen.getByTestId("TokenPriceChart__svg")).toBeInTheDocument();
      expect(screen.queryByTestId("TokenPriceChart__inspect-guide")).toBeNull();
      expect(
        screen.queryByTestId("TokenPriceChart__inspect-timestamp"),
      ).toBeNull();

      // Let the deferred fetch and its effects settle, then confirm the
      // reported delta agrees.
      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS);
        await Promise.resolve();
      });
      expect(reportedDelta).toEqual(
        expect.objectContaining({ inspectedPrice: null }),
      );
    });
  });
});
