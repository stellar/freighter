import React from "react";
import { Provider } from "react-redux";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { TFunction } from "i18next";
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
import {
  TokenPriceChart,
  formatInspectedTimestamp,
} from "popup/components/account/TokenPriceChart";
import { RANGE_SWITCH_DEBOUNCE_MS } from "popup/components/account/TokenPriceChart/constants";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

// The suite-wide `t` returns its key verbatim, which is enough everywhere else
// — but this file is about the VALUES interpolated into the chart's text
// alternative, so it needs a `t` that actually substitutes them.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options
        ? key.replace(/{{(\w+)}}/g, (_match, name: string) =>
            String(options[name] ?? ""),
          )
        : key,
    i18n: { resolvedLanguage: "en-US", language: "en-US" },
  }),
}));

installPointerEventPolyfill();

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

const HISTORY_1D = makeHistory({ points: densePoints(97) });

const respondByRange = (byRange: Record<string, unknown>) => {
  mockedSend.mockImplementation(({ path }: { path: string }) => {
    const match = /range=([A-Z0-9]+)/.exec(path);
    const range = match ? match[1] : "";
    if (!(range in byRange)) {
      return new Promise(() => {});
    }
    return Promise.resolve({ status: 200, body: { data: byRange[range] } });
  });
};

const asShortDate = (unixSeconds: number) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(unixSeconds * 1000));

const renderChart = () =>
  render(
    <Provider store={makeDummyStore({})}>
      <TokenPriceChart
        token="native"
        networkDetails={MAINNET_NETWORK_DETAILS}
        fallback24hPercent="1.09"
        onDeltaChange={() => {}}
      />
    </Provider>,
  );

const chartLabel = () =>
  screen.getByTestId("TokenPriceChart__svg").getAttribute("aria-label") ?? "";

describe("TokenPriceChart — the chart's text alternative", () => {
  afterEach(() => {
    mockedSend.mockReset();
    jest.useRealTimers();
  });

  it("announces the domain the chart plots, not a bucket end in the future", async () => {
    // `getChartCoordinates` clamps an in-progress final bucket to now, but the
    // label read the raw `t + resolutionSeconds`. On ALL that bucket is 30 days
    // wide, so assistive technology heard a range ending weeks past the last
    // drawn point.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const monthSeconds = 30 * 24 * 60 * 60;
    const inProgress = makeHistory({
      range: "ALL",
      resolutionSeconds: monthSeconds,
      points: [
        { t: nowSeconds - 2 * monthSeconds, p: "0.100000" },
        // Opened an hour ago, so its raw end is ~30 days out.
        { t: nowSeconds - 3600, p: "0.120000" },
      ],
    });

    jest.useFakeTimers();
    respondByRange({ "1D": HISTORY_1D, ALL: inProgress });
    renderChart();
    await act(async () => {
      await Promise.resolve();
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole("tab", { name: "ALL" }));
    await act(async () => {
      jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    await waitFor(() => expect(chartLabel()).toContain("ALL"));
    expect(chartLabel()).toContain(asShortDate(nowSeconds));
    expect(chartLabel()).not.toContain(
      asShortDate(nowSeconds - 3600 + monthSeconds),
    );
  });

  it("announces a settled final bucket at its own end, not at now", async () => {
    // The clamp is a ceiling, not a rewrite: a range whose last bucket closed
    // in the past still announces that close.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const daySeconds = 24 * 60 * 60;
    const settled = makeHistory({
      range: "1D",
      resolutionSeconds: daySeconds,
      points: [
        { t: nowSeconds - 6 * daySeconds, p: "0.100000" },
        { t: nowSeconds - 4 * daySeconds, p: "0.120000" },
      ],
    });

    respondByRange({ "1D": settled });
    renderChart();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__svg")).toBeDefined(),
    );
    expect(chartLabel()).toContain(asShortDate(nowSeconds - 3 * daySeconds));
    // The first point plots at ITS bucket end too: the spoken start is
    // (t + resolution), not the raw t one bucket earlier.
    expect(chartLabel()).toContain(asShortDate(nowSeconds - 5 * daySeconds));
    expect(chartLabel()).not.toContain(
      asShortDate(nowSeconds - 6 * daySeconds),
    );
  });

  it("labels the inspected point with its plotted time, the last one clamped to now", async () => {
    const nowSeconds = Math.floor(Date.UTC(2025, 8, 21, 12, 3, 30) / 1000);
    jest.useFakeTimers({ now: nowSeconds * 1000 });
    respondByRange({
      "1D": makeHistory({
        range: "1D",
        resolutionSeconds: 900,
        points: [
          { t: nowSeconds - 1800, p: "0.100000" },
          // Still in progress: its raw bucket end is ten minutes from now.
          { t: nowSeconds - 300, p: "0.120000" },
        ],
      }),
    });
    renderChart();
    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__svg")).toBeDefined(),
    );

    const substitute = ((key: string, options?: Record<string, unknown>) =>
      key.replace(/{{(\w+)}}/g, (_match, name: string) =>
        String(options?.[name] ?? ""),
      )) as unknown as TFunction;
    const expected = (unixSeconds: number) =>
      formatInspectedTimestamp({
        unixSeconds,
        range: "1D",
        language: "en-US",
        t: substitute,
      });
    const timestamp = () =>
      screen.getByTestId("TokenPriceChart__inspect-timestamp").textContent;

    const rectSpy = mockChartRect();
    const svg = screen.getByTestId("TokenPriceChart__svg");
    fireEvent.pointerDown(svg, {
      pointerType: "touch",
      clientX: 640,
      pointerId: 1,
    });
    expect(timestamp()).toBe(expected(nowSeconds));
    expect(timestamp()).not.toBe(expected(nowSeconds + 600));

    fireEvent.pointerMove(svg, {
      pointerType: "touch",
      clientX: 0,
      pointerId: 1,
    });
    expect(timestamp()).toBe(expected(nowSeconds - 900));
    rectSpy.mockRestore();
  });
});
