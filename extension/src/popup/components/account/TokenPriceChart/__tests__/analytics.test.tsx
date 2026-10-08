import React from "react";
import { Provider } from "react-redux";
import {
  render,
  renderHook,
  act,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { makeHistory } from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  installPointerEventPolyfill,
  mockChartRect,
} from "popup/__testHelpers__/pointerEvents";
import { TokenPriceChart } from "popup/components/account/TokenPriceChart";
import { RANGE_SWITCH_DEBOUNCE_MS } from "popup/components/account/TokenPriceChart/constants";
import { useGetTokenPriceHistory } from "helpers/hooks/useGetTokenPriceHistory";
import { emitMetric } from "helpers/metrics";

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

const CLASSIC_TOKEN =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const SOROBAN_TOKEN =
  "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";

const historyFor = (token: string, lowVolume: boolean | null) =>
  makeHistory({ token, lowVolume });

/**
 * The §7.5 canonical payload fixture — a frozen cross-platform contract with
 * mobile. Emitted payloads must deep-equal these byte-for-byte: event names
 * dot-namespaced, props snake_case, `range` in API spelling, booleans as
 * booleans, `low_volume` present only when the verdict is true.
 */
const CANONICAL_FIXTURE = [
  {
    event: "token_chart.loaded",
    props: { token_type: "classic", has_data: true, range: "1D" },
  },
  {
    event: "token_chart.loaded",
    props: {
      token_type: "soroban",
      has_data: true,
      low_volume: true,
      range: "1D",
    },
  },
  // Fires for a range the user was SHOWN, cache hits included — this one is
  // emitted off the session cache the two fetches above populated, which is
  // exactly the case `token_chart.loaded` cannot report. Carries the asset's
  // identity (the issuer is the asset's, not the viewer's — the viewer rides
  // on every event as the hashed `account_id_hash`).
  {
    event: "token_chart.viewed",
    props: {
      asset_code: "USDC",
      asset_issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      token_type: "classic",
      has_data: true,
      range: "1D",
    },
  },
  { event: "token_chart.range_changed", props: { range: "1W" } },
  // The 1W switch resolves for real (below) so drag-to-inspect has a chart to
  // act on — the fetch and its first showing are real outcomes, and both fire
  // in the normal order: `loaded` off the network response, `viewed` once it
  // is on screen.
  {
    event: "token_chart.loaded",
    props: { token_type: "classic", has_data: true, range: "1W" },
  },
  {
    event: "token_chart.viewed",
    props: {
      asset_code: "USDC",
      asset_issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      token_type: "classic",
      has_data: true,
      range: "1W",
    },
  },
  // Once per drag-to-inspect activation, on its FIRST move. A bare click
  // emits nothing at all (asserted below).
  { event: "token_chart.brushed", props: { range: "1W" } },
];

describe("token_chart analytics payloads (frozen cross-platform fixture)", () => {
  afterEach(() => {
    mockedSend.mockReset();
    mockedEmitMetric.mockReset();
    // The `getBoundingClientRect` spy below is installed on a shared
    // prototype; left in place it would hand every later test in this file a
    // 320-wide SVG.
    jest.restoreAllMocks();
  });

  it("emits payloads that deep-equal the canonical fixture", async () => {
    const store = makeDummyStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    // Fixture 1: a classic token resolving with data, verdict false.
    mockedSend.mockResolvedValueOnce({
      status: 200,
      body: { data: historyFor(CLASSIC_TOKEN, false) },
    });
    const { result } = renderHook(() => useGetTokenPriceHistory(), {
      wrapper,
    });
    await act(async () => {
      await result.current.fetchData({
        token: CLASSIC_TOKEN,
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    // Fixture 2: a soroban token resolving with data, verdict true.
    mockedSend.mockResolvedValueOnce({
      status: 200,
      body: { data: historyFor(SOROBAN_TOKEN, true) },
    });
    await act(async () => {
      await result.current.fetchData({
        token: SOROBAN_TOKEN,
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    // Fixture 3: a timeframe switch. The mount fetch (1D, already cached
    // above) never issues a network call and settles from the cache; the 1W
    // switch DOES resolve for real, so there is a chart to drag-to-inspect on
    // once it lands.
    mockedSend.mockImplementation(({ path }: { path: string }) =>
      path.includes("range=1W")
        ? Promise.resolve({
            status: 200,
            body: {
              data: makeHistory({
                token: CLASSIC_TOKEN,
                lowVolume: false,
                range: "1W",
              }),
            },
          })
        : new Promise(() => {}),
    );
    jest.useFakeTimers({ doNotFake: ["performance"] });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <Provider store={store}>
        <TokenPriceChart
          token={CLASSIC_TOKEN}
          networkDetails={MAINNET_NETWORK_DETAILS}
          onDeltaChange={() => {}}
        />
      </Provider>,
    );
    await user.click(screen.getByRole("tab", { name: "1W" }));
    await act(async () => {
      jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS);
      // Flushes the now-resolved 1W fetch's promise chain under fake timers.
      await Promise.resolve();
      await Promise.resolve();
    });
    jest.useRealTimers();

    await waitFor(() =>
      expect(screen.getByTestId("TokenPriceChart__svg")).toBeInTheDocument(),
    );

    mockChartRect(320, 140);
    fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
      pointerType: "touch",
      clientX: 10,
      pointerId: 1,
    });
    fireEvent.pointerMove(screen.getByTestId("TokenPriceChart__svg"), {
      pointerType: "touch",
      clientX: 200,
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByTestId("TokenPriceChart__svg"), {
      pointerType: "touch",
      pointerId: 1,
    });

    expect(mockedEmitMetric.mock.calls).toEqual(
      CANONICAL_FIXTURE.map((fixture) => [fixture.event, fixture.props]),
    );

    // A bare click is not a brush: pointerdown still moves the artwork, the
    // timestamp and the header, but with no movement there was no drag to
    // report — matching mobile, where a long-press-armed pan that never moves
    // never activates.
    fireEvent.pointerDown(screen.getByTestId("TokenPriceChart__svg"), {
      pointerType: "touch",
      clientX: 10,
      pointerId: 2,
    });
    fireEvent.pointerUp(screen.getByTestId("TokenPriceChart__svg"), {
      pointerType: "touch",
      pointerId: 2,
    });

    expect(mockedEmitMetric.mock.calls).toEqual(
      CANONICAL_FIXTURE.map((fixture) => [fixture.event, fixture.props]),
    );

    // A mouse brushes by hovering: one `brushed` per hover once it moves,
    // none for a pass that never moves.
    const svg = screen.getByTestId("TokenPriceChart__svg");
    const mouse = (clientX: number) => ({
      pointerType: "mouse",
      pointerId: 3,
      clientX,
    });
    mockedEmitMetric.mockClear();
    fireEvent.pointerEnter(svg, mouse(10));
    fireEvent.pointerMove(svg, mouse(100));
    fireEvent.pointerMove(svg, mouse(200));
    fireEvent.pointerLeave(svg, mouse(200));
    fireEvent.pointerEnter(svg, mouse(10));
    fireEvent.pointerLeave(svg, mouse(10));

    expect(mockedEmitMetric.mock.calls).toEqual(
      CANONICAL_FIXTURE.filter(
        (fixture) => fixture.event === "token_chart.brushed",
      ).map((fixture) => [fixture.event, fixture.props]),
    );
  });

  it("reports only the settled range when tapping through several", async () => {
    const store = makeDummyStore({});
    // Nothing resolves, so the only emissions possible are interaction events.
    mockedSend.mockImplementation(() => new Promise(() => {}));
    jest.useFakeTimers({ doNotFake: ["performance"] });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <Provider store={store}>
        <TokenPriceChart
          token={CLASSIC_TOKEN}
          networkDetails={MAINNET_NETWORK_DETAILS}
          onDeltaChange={() => {}}
        />
      </Provider>,
    );

    // 1W is passed through inside the debounce window; only 1M is settled on.
    await user.click(screen.getByRole("tab", { name: "1W" }));
    await user.click(screen.getByRole("tab", { name: "1M" }));
    act(() => {
      jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS);
    });
    jest.useRealTimers();

    expect(mockedEmitMetric.mock.calls).toEqual([
      ["token_chart.range_changed", { range: "1M" }],
    ]);
  });

  it("emits has_data: false on an empty series — the empty-state rate", async () => {
    const store = makeDummyStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    mockedSend.mockResolvedValueOnce({
      status: 200,
      body: {
        data: {
          ...historyFor("native", false),
          points: [],
          change: null,
        },
      },
    });
    const { result } = renderHook(() => useGetTokenPriceHistory(), {
      wrapper,
    });
    await act(async () => {
      await result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(mockedEmitMetric.mock.calls).toEqual([
      [
        "token_chart.loaded",
        { token_type: "native", has_data: false, range: "1D" },
      ],
    ]);
  });

  it("emits has_data: false on a single-point series — one point cannot draw a chart", async () => {
    const store = makeDummyStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const base = historyFor("native", false);
    mockedSend.mockResolvedValueOnce({
      status: 200,
      body: {
        data: {
          ...base,
          points: base.points.slice(0, 1),
          change: null,
        },
      },
    });
    const { result } = renderHook(() => useGetTokenPriceHistory(), {
      wrapper,
    });
    await act(async () => {
      await result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(mockedEmitMetric.mock.calls).toEqual([
      [
        "token_chart.loaded",
        { token_type: "native", has_data: false, range: "1D" },
      ],
    ]);
  });

  it("emits only for the response the UI adopts (the race)", async () => {
    const store = makeDummyStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    let resolveWeek: (v: unknown) => void = () => {};
    let resolveMonth: (v: unknown) => void = () => {};
    mockedSend.mockImplementation(({ path }: { path: string }) => {
      if (path.includes("range=1W")) {
        return new Promise((resolve) => {
          resolveWeek = resolve;
        });
      }
      return new Promise((resolve) => {
        resolveMonth = resolve;
      });
    });

    const { result } = renderHook(() => useGetTokenPriceHistory(), { wrapper });

    let weekPromise: Promise<unknown> = Promise.resolve();
    let monthPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      weekPromise = result.current.fetchData({
        token: "native",
        range: "1W",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
      monthPromise = result.current.fetchData({
        token: "native",
        range: "1M",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    // 1M (the current range) resolves first; the superseded 1W lands last. It
    // is discarded before it reaches the UI, so it is not an outcome and must
    // not be counted as one.
    await act(async () => {
      resolveMonth({
        status: 200,
        body: { data: { ...historyFor("native", false), range: "1M" } },
      });
      await monthPromise;
      resolveWeek({
        status: 200,
        body: { data: { ...historyFor("native", false), range: "1W" } },
      });
      await weekPromise;
    });

    expect(mockedEmitMetric.mock.calls).toEqual([
      [
        "token_chart.loaded",
        { token_type: "native", has_data: true, range: "1M" },
      ],
    ]);
  });

  it("emits nothing when the fetch fails — errors are not outcomes", async () => {
    const store = makeDummyStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    mockedSend.mockResolvedValueOnce({ status: 503, body: null });
    const { result } = renderHook(() => useGetTokenPriceHistory(), {
      wrapper,
    });
    await act(async () => {
      await result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(mockedEmitMetric).not.toHaveBeenCalled();
  });
});
