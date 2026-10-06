import React from "react";
import { Provider } from "react-redux";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { captureException } from "@sentry/browser";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { ApiTokenPriceHistory } from "@shared/api/types";
import {
  densePoints,
  makeHistory,
} from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { makeDummyStore } from "popup/__testHelpers__";
import { resetCacheWriteClaims } from "helpers/cacheWrites";
import {
  RangeDeltaState,
  TokenPriceChart,
} from "popup/components/account/TokenPriceChart";
import { RANGE_SWITCH_DEBOUNCE_MS } from "popup/components/account/TokenPriceChart/constants";
import { emitMetric } from "helpers/metrics";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));
const mockedEmitMetric = emitMetric as jest.Mock;

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));
const mockedCapture = captureException as jest.Mock;

/** A distinct §6.1 series per range, so a warm result landing under the wrong
 * range would be visible rather than indistinguishable. */
const HISTORY_BY_RANGE: Record<string, ApiTokenPriceHistory> = {
  "1H": makeHistory({
    range: "1H",
    resolutionSeconds: 300,
    change: { absolute: "0.000100", percent: "0.06" },
    points: densePoints(12, { stepSeconds: 300 }),
  }),
  "1D": makeHistory({ points: densePoints(97) }),
  "1W": makeHistory({
    range: "1W",
    resolutionSeconds: 3600,
    change: { absolute: "0.020000", percent: "12.50" },
    points: densePoints(169, { stepSeconds: 3600, startPrice: 0.16 }),
  }),
  "1M": makeHistory({
    range: "1M",
    resolutionSeconds: 14400,
    change: { absolute: "0.030000", percent: "20.00" },
    points: densePoints(180, { stepSeconds: 14400 }),
  }),
  "1Y": makeHistory({
    range: "1Y",
    resolutionSeconds: 259200,
    change: { absolute: "-0.010000", percent: "-5.00" },
    points: densePoints(122, {
      stepSeconds: 259200,
      startPrice: 0.2,
      priceStep: -0.0002,
    }),
  }),
  ALL: makeHistory({
    range: "ALL",
    resolutionSeconds: 604800,
    change: { absolute: "0.100000", percent: "200.00" },
    points: densePoints(277, { stepSeconds: 604800 }),
  }),
};

/** The order the warm pass must walk: ALL first, then the selector's own,
 * minus 1D, which is the initially-selected range and pays its own way. */
const WARM_ORDER = ["ALL", "1H", "1W", "1M", "1Y"];

const TOKEN = "native";
const OTHER_TOKEN =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

// A transport that answers nothing until a test says so — the only way to
// prove the queue is sequential rather than a five-request fan-out.
const requested: { token: string; range: string }[] = [];
const pending = new Map<string, (value: unknown) => void>();
const keyOf = (token: string, range: string) => `${token}:${range}`;

const installTransport = () => {
  requested.length = 0;
  pending.clear();
  mockedSend.mockImplementation(({ path }: { path: string }) => {
    const params = new URLSearchParams(path.slice(path.indexOf("?") + 1));
    const token = params.get("token") ?? "";
    const range = params.get("range") ?? "";
    requested.push({ token, range });
    return new Promise((resolve) => {
      pending.set(keyOf(token, range), resolve);
    });
  });
};

/** The ranges requested for one token, in the order they went out. */
const rangesFor = (token = TOKEN) =>
  requested.filter((entry) => entry.token === token).map((r) => r.range);

/** Drains every microtask the transport's promises are chained through: a
 * macrotask boundary runs only once the microtask queue is empty. */
const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const answer = async (range: string, response: unknown, token = TOKEN) => {
  const key = keyOf(token, range);
  const resolve = pending.get(key);
  if (!resolve) {
    throw new Error(`no request in flight for ${key}`);
  }
  pending.delete(key);
  resolve(response);
  await settle();
};

const resolveRange = (range: string, token = TOKEN) =>
  answer(
    range,
    // Echo the requested token: the client rejects a body for another asset.
    { status: 200, body: { data: { ...HISTORY_BY_RANGE[range], token } } },
    token,
  );

const failRange = (range: string, token = TOKEN) =>
  answer(range, { status: 503, body: { error: "down" } }, token);

let reportedDelta: RangeDeltaState | null = null;
const handleDelta = (delta: RangeDeltaState) => {
  reportedDelta = delta;
};

const renderChart = (preloadedCache: Record<string, unknown> = {}) => {
  const store = makeDummyStore({ cache: preloadedCache });
  const tree = (token: string) => (
    <Provider store={store}>
      <TokenPriceChart
        token={token}
        networkDetails={MAINNET_NETWORK_DETAILS}
        fallback24hPercent="1.09"
        onDeltaChange={handleDelta}
      />
    </Provider>
  );
  const rendered = render(tree(TOKEN));
  return {
    ...rendered,
    // The section is not keyed by token, so `AssetDetail` can hand it another
    // one in place.
    switchToken: (token: string) => act(() => rendered.rerender(tree(token))),
  };
};

const selectedTab = () =>
  screen
    .getAllByRole("tab")
    .find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent;

const polylinePoints = () =>
  screen.getByTestId("TokenPriceChart__polyline").getAttribute("points");

/** Waits out the range-switch debounce in real time; the warm queue runs on
 * promises alone, so it makes no difference to it. */
const waitOutDebounce = async () => {
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, RANGE_SWITCH_DEBOUNCE_MS + 20),
    );
  });
};

/**
 * Deferred warming (§7.0): once the selected range has landed, the other five
 * are pulled into the session cache one at a time, so the first switch to any
 * of them is a cache hit. The whole pass is invisible — no analytics, no UI
 * state, no error surface — and it only runs inside this component, which
 * `AssetDetail` renders solely when the chart itself is shown (flag on,
 * mainnet), so a network with no chart never warms.
 */
describe("TokenPriceChart deferred range warming", () => {
  beforeEach(() => {
    reportedDelta = null;
  });

  afterEach(() => {
    mockedSend.mockReset();
    mockedEmitMetric.mockReset();
    mockedCapture.mockReset();
    resetCacheWriteClaims();
  });

  it("issues no warm request until the selected range's own fetch resolves", async () => {
    installTransport();
    renderChart();
    await settle();

    // First paint pays for exactly one request, as it does today.
    expect(rangesFor()).toEqual(["1D"]);

    await resolveRange("1D");

    // Only now does the queue open — with one range, not five.
    expect(rangesFor()).toEqual(["1D", "ALL"]);
  });

  it("warms the other five one at a time, ALL first", async () => {
    installTransport();
    renderChart();
    await settle();
    await resolveRange("1D");

    // Each range starts only once its predecessor has settled. Five in flight
    // at once would compete with the balance and price loads on screen-open,
    // which is the whole reason this is deferred.
    for (let i = 0; i < WARM_ORDER.length; i += 1) {
      expect(rangesFor()).toEqual(["1D", ...WARM_ORDER.slice(0, i + 1)]);
      // eslint-disable-next-line no-await-in-loop
      await resolveRange(WARM_ORDER[i]);
    }

    expect(rangesFor()).toEqual(["1D", ...WARM_ORDER]);

    // One pass per visit: never a loop, never periodic.
    await settle();
    await settle();
    expect(rangesFor()).toEqual(["1D", ...WARM_ORDER]);
  });

  it("stops the queue when the section unmounts", async () => {
    installTransport();
    const { unmount } = renderChart();
    await settle();
    await resolveRange("1D");
    expect(rangesFor()).toEqual(["1D", "ALL"]);

    unmount();

    // ALL's response still lands, but nothing queued behind it is started: a
    // user who bounces into a token and straight back out must not cost six
    // requests.
    await resolveRange("ALL");
    await settle();
    expect(rangesFor()).toEqual(["1D", "ALL"]);
  });

  it("starts no warm pass when the section unmounts BEFORE the selected range resolves", async () => {
    installTransport();
    const { unmount } = renderChart();
    await settle();

    // Only the selected range is in flight; the warm pass has not been armed
    // yet, because it is deferred behind this very request.
    expect(rangesFor()).toEqual(["1D"]);

    // The user leaves while 1D is still outstanding. This is the case the
    // sibling test above does NOT cover: there, the fetch had already
    // resolved and the queue was running. Here the cancellation has to be
    // observed by a warm pass that has not started yet, so the generation
    // must be snapshotted before the request went out — read after the fact,
    // it would already carry the bumped value and warm all five ranges.
    unmount();
    await resolveRange("1D");
    await settle();

    expect(rangesFor()).toEqual(["1D"]);
  });

  it("starts no warm pass when the selected range's own request fails", async () => {
    installTransport();
    renderChart();
    await settle();
    expect(rangesFor()).toEqual(["1D"]);

    // The endpoint is down. Warming behind it would fire five more requests
    // at the thing that just failed, turning one outage into six requests on
    // every detail visit.
    await failRange("1D");
    await settle();

    expect(rangesFor()).toEqual(["1D"]);
  });

  it("still warms behind a successful but EMPTY series", async () => {
    installTransport();
    renderChart();
    await settle();

    // An empty series is a 200, not a failure — the endpoint is healthy and
    // the other ranges are still worth prefetching. This is what stops the
    // guard above from being "warm only when there is data".
    await answer("1D", {
      status: 200,
      body: { data: { ...HISTORY_BY_RANGE["1D"], points: [], change: null } },
    });
    await settle();

    expect(rangesFor().length).toBeGreaterThan(1);
  });

  it("issues no duplicate request when a warm lands during the switch debounce", async () => {
    installTransport();
    renderChart();
    await settle();
    await resolveRange("1D");

    // Let the warm pass populate 1H while the user is still on 1D.
    await resolveRange("ALL");
    await resolveRange("1H");
    await settle();
    const before = rangesFor().filter((r) => r === "1H").length;

    // Now switch to 1H. `isCached` was evaluated when the effect ran, but the
    // debounced call goes through `fetchData`, which re-reads the cache
    // synchronously before touching the network — so a range warmed in the
    // meantime is served from cache rather than requested a second time.
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "1H" }));
    await waitOutDebounce();
    await settle();

    expect(rangesFor().filter((r) => r === "1H").length).toBe(before);
  });

  it("cancels the queue on a token change, and gives the new token its own pass", async () => {
    installTransport();
    const { switchToken } = renderChart();
    await settle();
    await resolveRange("1D");
    expect(rangesFor()).toEqual(["1D", "ALL"]);

    switchToken(OTHER_TOKEN);
    await waitOutDebounce();

    // The new token fetches the selected range, debounced like any switch.
    expect(rangesFor(OTHER_TOKEN)).toEqual(["1D"]);

    // The old token's ALL comes back late. Nothing more is warmed for a token
    // the user has left — a shared cancellation flag reset for the new scope
    // would have let this queue resume under it.
    await resolveRange("ALL");
    expect(rangesFor()).toEqual(["1D", "ALL"]);

    // ...and the new token gets a pass of its own once its range lands.
    await resolveRange("1D", OTHER_TOKEN);
    expect(rangesFor(OTHER_TOKEN)).toEqual(["1D", "ALL"]);
    expect(rangesFor()).toEqual(["1D", "ALL"]);
  });

  it("restarts the pass when the user comes back to a token before the other one loaded", async () => {
    installTransport();
    const { switchToken } = renderChart();
    await settle();
    await resolveRange("1D");
    expect(rangesFor()).toEqual(["1D", "ALL"]);

    // Away and straight back, before the other token's own range answers.
    switchToken(OTHER_TOKEN);
    await waitOutDebounce();
    switchToken(TOKEN);
    await waitOutDebounce();

    // The interrupted pass picks up again rather than staying abandoned —
    // the sparse notices wait for it to finish.
    await resolveRange("ALL");
    await settle();
    expect(rangesFor()).toEqual(["1D", "ALL", "1H"]);
  });

  it("skips a range already valid in the session cache", async () => {
    installTransport();
    renderChart({
      tokenPriceHistory: {
        [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
          native: {
            "1W": { ...HISTORY_BY_RANGE["1W"], updatedAt: Date.now() },
          },
        },
      },
    });
    await settle();
    await resolveRange("1D");
    await resolveRange("ALL");
    await resolveRange("1H");

    // 1W is fresh, so the queue steps straight over it to 1M.
    expect(rangesFor()).toEqual(["1D", "ALL", "1H", "1M"]);
  });

  it("emits no analytics for the ranges it warms", async () => {
    installTransport();
    renderChart();
    await settle();
    await resolveRange("1D");
    for (const range of WARM_ORDER) {
      // eslint-disable-next-line no-await-in-loop
      await resolveRange(range);
    }

    // Six ranges fetched, ONE range shown — and exactly two events, both for
    // the shown range. `loaded` is the per-network-fetch outcome event; six of
    // them per screen-open would destroy the empty-state rate and the §12
    // criterion on timeframe changes per session. `viewed` is the per-range
    // view event, and warming shows the user nothing, so it must not fire for
    // a warmed range either. Nothing was changed, so no `range_changed`.
    expect(mockedEmitMetric.mock.calls).toEqual([
      [
        "token_chart.loaded",
        { token_type: "native", has_data: true, range: "1D" },
      ],
      [
        "token_chart.viewed",
        {
          asset_code: "XLM",
          token_type: "native",
          has_data: true,
          range: "1D",
        },
      ],
    ]);
  });

  it("leaves the displayed range, delta and loading state untouched", async () => {
    installTransport();
    renderChart();
    await settle();
    await resolveRange("1D");

    const settledPoints = polylinePoints();
    const settledDelta = { ...reportedDelta! };
    expect(settledDelta.text).toBe("+$0.0014 (0.86%)");

    // The sharpest case: a warmed range with no data at all. It must not flip
    // the section to its empty state, drop the notice in, or touch the delta.
    await answer("ALL", {
      status: 200,
      body: {
        data: { ...HISTORY_BY_RANGE.ALL, points: [], change: null },
      },
    });

    expect(selectedTab()).toBe("1D");
    expect(polylinePoints()).toBe(settledPoints);
    expect(reportedDelta).toEqual(settledDelta);
    expect(screen.queryByTestId("TokenPriceChart__loading")).toBeNull();
    expect(screen.queryByTestId("TokenPriceChart__empty")).toBeNull();
    // Only the displayed range's own two events. A warmed range that came
    // back EMPTY must not report `has_data: false` — the user was never shown
    // it, and counting it would corrupt the §12 empty-state rate with ranges
    // nobody opened. Asserting the names, not just the count, so a future
    // event cannot slip in here unnoticed.
    expect(mockedEmitMetric.mock.calls.map(([event]) => event)).toEqual([
      "token_chart.loaded",
      "token_chart.viewed",
    ]);
  });

  it("never warms the range the user has switched to", async () => {
    installTransport();
    renderChart();
    await settle();
    await resolveRange("1D");

    // The user gets to 1M first; their own fetch owns it, and the queue must
    // not duplicate it.
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "1M" }));
    await waitOutDebounce();
    expect(rangesFor()).toEqual(["1D", "ALL", "1M"]);

    // 1W settles, and then 1M is stepped over — even though the user's own
    // request for it has not come back yet, so it is not cached.
    await resolveRange("ALL");
    await resolveRange("1H");
    expect(rangesFor()).toEqual(["1D", "ALL", "1M", "1H", "1W"]);
    await resolveRange("1W");
    expect(rangesFor()).toEqual(["1D", "ALL", "1M", "1H", "1W", "1Y"]);

    // ...and the user is still waiting on their own range, not on a warm one.
    expect(selectedTab()).toBe("1M");
    expect(screen.getByTestId("TokenPriceChart__loading")).toBeDefined();
  });

  it("makes a switch to a warmed range a cache hit", async () => {
    installTransport();
    renderChart();
    await settle();
    await resolveRange("1D");
    for (const range of WARM_ORDER) {
      // eslint-disable-next-line no-await-in-loop
      await resolveRange(range);
    }
    expect(rangesFor()).toEqual(["1D", ...WARM_ORDER]);

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "1W" }));

    // The entire payoff: no request, no ghost, no debounce — the warmed entry
    // serves the switch and it morphs like any other cached one.
    expect(rangesFor()).toEqual(["1D", ...WARM_ORDER]);
    expect(screen.queryByTestId("TokenPriceChart__loading")).toBeNull();
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();
    expect(selectedTab()).toBe("1W");
    expect(reportedDelta?.text).toContain("12.50%");
  });

  it("keeps a warm failure silent, and still reports a user switch to it", async () => {
    installTransport();
    renderChart();
    await settle();
    await resolveRange("1D");
    await resolveRange("ALL");
    await failRange("1H");

    // Nothing happened as far as the user is concerned: 1D is still on
    // screen, there is no error state and nothing was reported.
    expect(selectedTab()).toBe("1D");
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();
    expect(screen.queryByTestId("TokenPriceChart__empty")).toBeNull();
    expect(reportedDelta?.text).toBe("+$0.0014 (0.86%)");
    expect(mockedCapture).not.toHaveBeenCalled();

    // The queue carries on past the failure — a skip, never a retry.
    expect(rangesFor()).toEqual(["1D", "ALL", "1H", "1W"]);

    // A later user switch to that same range runs the normal fetch path and
    // reports exactly as it does today.
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "1H" }));
    await waitOutDebounce();
    expect(rangesFor().filter((range) => range === "1H")).toHaveLength(2);

    await failRange("1H");
    expect(mockedCapture).toHaveBeenCalledTimes(1);
    expect(String(mockedCapture.mock.calls[0][0])).toContain(
      "token price history",
    );
    expect(screen.getByTestId("TokenPriceChart__empty")).toBeDefined();
    expect(reportedDelta?.text).toBe("");
  });
});
