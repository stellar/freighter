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
import { TokenPriceChart } from "popup/components/account/TokenPriceChart";
import {
  TokenChartNoticeVariant,
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
