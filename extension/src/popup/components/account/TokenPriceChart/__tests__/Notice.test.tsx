import React from "react";
import { Provider } from "react-redux";
import { render, screen, waitFor } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { ApiTokenPriceHistory } from "@shared/api/types";
import {
  densePoints,
  makeHistory,
} from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { makeDummyStore } from "popup/__testHelpers__";
import { resetCacheWriteClaims } from "helpers/cacheWrites";
import { TokenPriceChart } from "popup/components/account/TokenPriceChart";
import {
  TokenChartNoticeVariant,
  getFirstTradeLowerBound,
  getNoticeVariant,
} from "popup/components/account/TokenPriceChart/Notice";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

const historyWith = (overrides: Partial<ApiTokenPriceHistory>) =>
  makeHistory({ points: densePoints(97), ...overrides });

const renderChartWith = async (history: ApiTokenPriceHistory) => {
  mockedSend.mockResolvedValue({ status: 200, body: { data: history } });
  const store = makeDummyStore({});
  render(
    <Provider store={store}>
      <TokenPriceChart
        token="native"
        networkDetails={MAINNET_NETWORK_DETAILS}
        onDeltaChange={() => {}}
      />
    </Provider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
  );
};

const NOW = 1790000000;
const TWO_WEEKS = 1209600;

describe("getNoticeVariant precedence", () => {
  it("picks low-volume over limited-data when both hold", () => {
    // The common case: low volume causes the sparseness. The safety copy
    // explains both (§4.4 rule 4).
    expect(
      getNoticeVariant({
        lowVolume: true,
        points: densePoints(5),
        range: "1D",
        resolutionSeconds: 900,
        nowSeconds: NOW,
      }),
    ).toBe(TokenChartNoticeVariant.LowVolume);
  });

  it("returns limited-data below ~33% of the range's expected points", () => {
    // 1D expects 97 points; 31 < 97 * 0.33.
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: densePoints(31),
        range: "1D",
        resolutionSeconds: 900,
        nowSeconds: NOW,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
    // 1H expects 12: five points is a normal chart there.
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: densePoints(5),
        range: "1H",
        resolutionSeconds: 900,
        nowSeconds: NOW,
      }),
    ).toBeNull();
  });

  it("returns verdict-unavailable on a null verdict — never the manipulation copy, never silence", () => {
    expect(
      getNoticeVariant({
        lowVolume: null,
        points: densePoints(97),
        range: "1D",
        resolutionSeconds: 900,
        nowSeconds: NOW,
      }),
    ).toBe(TokenChartNoticeVariant.VerdictUnavailable);
  });

  it("does not flag ALL for a young token with an unbroken history", () => {
    // USDY's shape: 27 two-week buckets since launch, none missing. Against
    // the fixed 277 it read as 10% coverage.
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: densePoints(27, {
          startT: NOW - 27 * TWO_WEEKS,
          stepSeconds: TWO_WEEKS,
        }),
        range: "ALL",
        resolutionSeconds: TWO_WEEKS,
        nowSeconds: NOW,
      }),
    ).toBeNull();
  });

  it("still flags ALL when a token's own history has gaps", () => {
    // First bucket ~3 years back (78 buckets to now), only 10 of them traded.
    const points = [
      { t: NOW - 78 * TWO_WEEKS, p: "1" },
      ...densePoints(9, {
        startT: NOW - 9 * TWO_WEEKS,
        stepSeconds: TWO_WEEKS,
      }),
    ];
    expect(
      getNoticeVariant({
        lowVolume: false,
        points,
        range: "ALL",
        resolutionSeconds: TWO_WEEKS,
        nowSeconds: NOW,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
  });

  it("returns nothing for a dense, above-threshold series", () => {
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: densePoints(97),
        range: "1D",
        resolutionSeconds: 900,
        nowSeconds: NOW,
      }),
    ).toBeNull();
  });
});

describe("getNoticeVariant newly-traded", () => {
  const THREE_DAYS = 259200;
  const FIFTEEN_MIN = 900;
  // USDT0 on 1Y: 12 three-day buckets, unbroken, from its first trade ~5
  // weeks ago. Against the fixed 122 it reads as 10% coverage.
  const youngOneYear = densePoints(12, {
    startT: NOW - 12 * THREE_DAYS,
    stepSeconds: THREE_DAYS,
  });
  const firstTradeInWindow = NOW - 13 * THREE_DAYS;

  it("returns newly-traded when the first trade is inside the window and coverage since is dense", () => {
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: youngOneYear,
        range: "1Y",
        resolutionSeconds: THREE_DAYS,
        nowSeconds: NOW,
        firstTradeSeconds: firstTradeInWindow,
      }),
    ).toBe(TokenChartNoticeVariant.NewlyTraded);
  });

  it("falls back to limited-data while the token's first trade is unknown", () => {
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: youngOneYear,
        range: "1Y",
        resolutionSeconds: THREE_DAYS,
        nowSeconds: NOW,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
  });

  it("keeps limited-data for an old token that only traded late in the window", () => {
    // The backend returns only buckets that traded, so this series alone is
    // indistinguishable from a young token: 8 dense buckets in the last 2h.
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: densePoints(8, {
          startT: NOW - 8 * FIFTEEN_MIN,
          stepSeconds: FIFTEEN_MIN,
        }),
        range: "1D",
        resolutionSeconds: FIFTEEN_MIN,
        nowSeconds: NOW,
        firstTradeSeconds: NOW - 2 * 365 * 86400,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
  });

  it("keeps limited-data when the first trade is only known to fall before the window", () => {
    // ALL's two-week buckets start before the 1W window even though the
    // token may have started inside it — not determinable, so fall back.
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: densePoints(40, {
          startT: NOW - 40 * 3600,
          stepSeconds: 3600,
        }),
        range: "1W",
        resolutionSeconds: 3600,
        nowSeconds: NOW,
        firstTradeSeconds: NOW - 10 * 86400,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
  });

  it("keeps limited-data for a young token with gaps since its first trade", () => {
    // First bucket 12 three-day buckets back, only 3 of them traded.
    const points = [
      { t: NOW - 12 * THREE_DAYS, p: "1" },
      ...densePoints(2, {
        startT: NOW - 2 * THREE_DAYS,
        stepSeconds: THREE_DAYS,
      }),
    ];
    expect(
      getNoticeVariant({
        lowVolume: false,
        points,
        range: "1Y",
        resolutionSeconds: THREE_DAYS,
        nowSeconds: NOW,
        firstTradeSeconds: firstTradeInWindow,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
  });

  it("measures coverage in the range's own buckets, not the derived resolution", () => {
    // Launched 20h ago and traded every 2h: the backend derives a 2h
    // resolution from the gaps, but that is 10 of 80 fifteen-minute buckets.
    expect(
      getNoticeVariant({
        lowVolume: false,
        points: densePoints(10, {
          startT: NOW - 20 * 3600,
          stepSeconds: 7200,
        }),
        range: "1D",
        resolutionSeconds: 7200,
        nowSeconds: NOW,
        firstTradeSeconds: NOW - 20 * 3600,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
  });

  it("keeps low-volume ahead of newly-traded", () => {
    expect(
      getNoticeVariant({
        lowVolume: true,
        points: youngOneYear,
        range: "1Y",
        resolutionSeconds: THREE_DAYS,
        nowSeconds: NOW,
        firstTradeSeconds: firstTradeInWindow,
      }),
    ).toBe(TokenChartNoticeVariant.LowVolume);
  });

  it("holds back both sparse notices until the other ranges have settled", () => {
    const sparse = {
      lowVolume: false,
      points: youngOneYear,
      range: "1Y",
      resolutionSeconds: THREE_DAYS,
      nowSeconds: NOW,
      rangesSettled: false,
    };
    expect(
      getNoticeVariant({ ...sparse, firstTradeSeconds: firstTradeInWindow }),
    ).toBeNull();
    expect(getNoticeVariant(sparse)).toBeNull();
    // The verdict notices depend on nothing else loading.
    expect(getNoticeVariant({ ...sparse, lowVolume: true })).toBe(
      TokenChartNoticeVariant.LowVolume,
    );
    expect(getNoticeVariant({ ...sparse, lowVolume: null })).toBe(
      TokenChartNoticeVariant.VerdictUnavailable,
    );
  });

  it("never returns newly-traded on ALL, which is already lifetime-relative", () => {
    const points = [
      { t: NOW - 78 * TWO_WEEKS, p: "1" },
      ...densePoints(9, {
        startT: NOW - 9 * TWO_WEEKS,
        stepSeconds: TWO_WEEKS,
      }),
    ];
    expect(
      getNoticeVariant({
        lowVolume: false,
        points,
        range: "ALL",
        resolutionSeconds: TWO_WEEKS,
        nowSeconds: NOW,
        firstTradeSeconds: NOW - 78 * TWO_WEEKS,
      }),
    ).toBe(TokenChartNoticeVariant.LimitedData);
  });
});

describe("getFirstTradeLowerBound", () => {
  const HOUR = 3600;
  const DAY = 86400;
  const cached = (
    range: ApiTokenPriceHistory["range"],
    firstT: number,
    updatedAtSeconds = NOW,
  ) => ({
    ...makeHistory({ range, points: [{ t: firstT, p: "1" }] }),
    updatedAt: updatedAtSeconds * 1000,
  });

  it("is unknown until ALL is cached", () => {
    expect(
      getFirstTradeLowerBound({ "1D": cached("1D", NOW - 6 * HOUR) }),
    ).toBeUndefined();
  });

  it("is ALL's first bucket start when nothing finer covers it", () => {
    expect(
      getFirstTradeLowerBound({ ALL: cached("ALL", NOW - 400 * DAY) }),
    ).toBe(NOW - 400 * DAY);
  });

  it("narrows a launch hours ago down to the 1D bucket", () => {
    // ALL's two-week bucket alone starts before the 1D window.
    expect(
      getFirstTradeLowerBound({
        ALL: cached("ALL", NOW - 12 * DAY),
        "1Y": cached("1Y", NOW - 2 * DAY),
        "1M": cached("1M", NOW - 8 * HOUR),
        "1W": cached("1W", NOW - 7 * HOUR),
        "1D": cached("1D", NOW - 6 * HOUR),
      }),
    ).toBe(NOW - 6 * HOUR);
  });

  it("does not narrow through a range whose window starts after the bound", () => {
    // 1W's window starts 7 days back, after the 8.5-day bound, so trades
    // before it are invisible to 1W — its later first point proves nothing.
    expect(
      getFirstTradeLowerBound({
        ALL: cached("ALL", NOW - 10 * DAY),
        "1M": cached("1M", NOW - 8.5 * DAY),
        "1W": cached("1W", NOW - 1 * DAY),
      }),
    ).toBe(NOW - 8.5 * DAY);
  });

  it("measures a range fetched after the chart landed from its own fetch time", () => {
    // 1W was warmed 20s after `nowSeconds` was taken, so its window starts
    // 20s later than `now - 7d` and does not reach the bound 10s after that.
    expect(
      getFirstTradeLowerBound({
        ALL: cached("ALL", NOW - 7 * DAY + 10),
        "1W": cached("1W", NOW - 1 * DAY, NOW + 20),
      }),
    ).toBe(NOW - 7 * DAY + 10);
  });

  it("measures a cached range's window from when it was fetched", () => {
    // 1W fetched 3 days ago reached back 10 days, past the 9-day bound.
    expect(
      getFirstTradeLowerBound({
        ALL: cached("ALL", NOW - 9 * DAY),
        "1W": cached("1W", NOW - 8 * DAY, NOW - 3 * DAY),
      }),
    ).toBe(NOW - 8 * DAY);
  });
});

describe("TokenPriceChart notices", () => {
  afterEach(() => {
    mockedSend.mockReset();
  });

  it("renders the low-volume banner over an otherwise-normal chart", async () => {
    await renderChartWith(historyWith({ lowVolume: true }));

    const notice = screen.getByTestId("TokenChartNotice");
    expect(notice.getAttribute("data-variant")).toBe("low-volume");
    expect(notice.textContent).toContain("Low trading volume");
    // The banner is the entire intervention: the chart and the timeframe
    // selector stay.
    expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders no banner when the verdict is false and data is dense", async () => {
    await renderChartWith(historyWith({}));

    expect(screen.queryByTestId("TokenChartNotice")).toBeNull();
  });

  it("renders the verdict-unavailable copy on a null verdict", async () => {
    await renderChartWith(historyWith({ lowVolume: null }));

    const notice = screen.getByTestId("TokenChartNotice");
    expect(notice.getAttribute("data-variant")).toBe("verdict-unavailable");
    expect(notice.textContent).toContain("verify trading activity");
  });

  it("renders the limited-data caption on a sparse above-threshold series", async () => {
    await renderChartWith(historyWith({ points: densePoints(10) }));

    const notice = screen.getByTestId("TokenChartNotice");
    expect(notice.getAttribute("data-variant")).toBe("limited-data");
    expect(notice.textContent).toContain("Limited trading data");
  });

  it("gives low-volume precedence over limited-data on a sparse series", async () => {
    await renderChartWith(
      historyWith({ points: densePoints(10), lowVolume: true }),
    );

    expect(
      screen.getByTestId("TokenChartNotice").getAttribute("data-variant"),
    ).toBe("low-volume");
  });
});

describe("newly-traded notice from the warmed cache", () => {
  const HOUR = 3600;
  const DAY = 86400;

  afterEach(() => {
    mockedSend.mockReset();
    // A request left hanging would otherwise be joined by the next test.
    resetCacheWriteClaims();
  });

  /** A token that first traded 6 hours ago; each range answers with its own
   * first bucket, and `failAll` makes the ALL request fail. */
  const answerLaunchedToday = ({ failAll }: { failAll: boolean }) => {
    const now = Math.floor(Date.now() / 1000);
    const launch = now - 6 * HOUR;
    const byRange: Record<string, ApiTokenPriceHistory> = {
      "1D": makeHistory({
        range: "1D",
        resolutionSeconds: 900,
        points: densePoints(24, { startT: launch, stepSeconds: 900 }),
      }),
      "1H": makeHistory({
        range: "1H",
        resolutionSeconds: 300,
        points: densePoints(12, { startT: now - HOUR, stepSeconds: 300 }),
      }),
      "1W": makeHistory({
        range: "1W",
        resolutionSeconds: 3600,
        points: densePoints(6, { startT: launch, stepSeconds: 3600 }),
      }),
      "1M": makeHistory({
        range: "1M",
        resolutionSeconds: 14400,
        points: densePoints(2, { startT: now - 8 * HOUR, stepSeconds: 14400 }),
      }),
      "1Y": makeHistory({
        range: "1Y",
        resolutionSeconds: 259200,
        points: [{ t: now - 2 * DAY, p: "1" }],
      }),
      ALL: makeHistory({
        range: "ALL",
        resolutionSeconds: 1209600,
        points: [{ t: now - 12 * DAY, p: "1" }],
      }),
    };
    mockedSend.mockImplementation(({ path }: { path: string }) => {
      const range =
        new URLSearchParams(path.slice(path.indexOf("?") + 1)).get("range") ??
        "";
      if (range === "ALL" && failAll) {
        return Promise.resolve({ status: 500, body: {} });
      }
      return Promise.resolve({ status: 200, body: { data: byRange[range] } });
    });
  };

  const renderChart = () =>
    render(
      <Provider store={makeDummyStore({})}>
        <TokenPriceChart
          token="native"
          networkDetails={MAINNET_NETWORK_DETAILS}
          onDeltaChange={() => {}}
        />
      </Provider>,
    );

  it("shows newly-traded on 1D once the warmed ranges pin the first trade", async () => {
    answerLaunchedToday({ failAll: false });
    renderChart();

    await waitFor(() =>
      expect(
        screen.getByTestId("TokenChartNotice").getAttribute("data-variant"),
      ).toBe("newly-traded"),
    );
    expect(screen.getByTestId("TokenChartNotice").textContent).toContain(
      "Newly traded token",
    );
  });

  it("shows no sparse notice while a range is still loading", async () => {
    answerLaunchedToday({ failAll: false });
    const answer = mockedSend.getMockImplementation()!;
    // ALL is first in the warm queue, so the pass parks on it.
    mockedSend.mockImplementation((args: { path: string }) =>
      args.path.includes("range=ALL") ? new Promise(() => {}) : answer(args),
    );
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined(),
    );
    await waitFor(() => expect(mockedSend).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("TokenChartNotice")).toBeNull();
  });

  it("stays limited-data when ALL never loads", async () => {
    answerLaunchedToday({ failAll: true });
    renderChart();

    // Every other range warms; without ALL the first trade stays unknown.
    await waitFor(() => expect(mockedSend).toHaveBeenCalledTimes(6));
    await waitFor(() =>
      expect(
        screen.getByTestId("TokenChartNotice").getAttribute("data-variant"),
      ).toBe("limited-data"),
    );
  });
});

describe("notice placement", () => {
  it("renders the notice region below the timeframe selector", async () => {
    await renderChartWith(historyWith({ lowVolume: true }));

    const polyline = screen.getByTestId("TokenPriceChart__polyline");
    const selectorTab = screen.getByTestId("TokenPriceChart__range-1D");
    const notice = screen.getByTestId("TokenPriceChart__notice");
    expect(notice.textContent).toContain("Low trading volume");
    // eslint-disable-next-line no-bitwise
    const follows = (a: Node, b: Node) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(polyline, selectorTab)).toBe(true);
    expect(follows(selectorTab, notice)).toBe(true);
  });
});
