import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { SERVICE_TYPES } from "@shared/constants/services";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { RequestState } from "constants/request";
import { makeDummyStore } from "popup/__testHelpers__";
import { PRICE_HISTORY_STALE_MS } from "popup/ducks/cache";
import { makeHistory } from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { emitMetric } from "helpers/metrics";
import { useGetTokenPriceHistory } from "../hooks/useGetTokenPriceHistory";

// The v2 calls go through the FETCH_BACKEND_V2 background chokepoint, so the
// messaging layer (not fetch) is what gets mocked.
jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

// Keep amplitude/store side effects out of these tests; the emitted payloads
// have their own dedicated fixture test.
jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));
const mockedEmitMetric = emitMetric as jest.Mock;

const HISTORY_1D = makeHistory();
const HISTORY_1W = makeHistory({ range: "1W", points: [{ t: 5, p: "0.9" }] });

const okResponse = (data: unknown) => ({ status: 200, body: { data } });

const renderTestHook = (preloadedCache = {}) => {
  const store = makeDummyStore({ cache: preloadedCache });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const rendered = renderHook(() => useGetTokenPriceHistory(), { wrapper });
  return { store, rendered };
};

const cachedEntry = (store: ReturnType<typeof makeDummyStore>, range: string) =>
  store.getState().cache.tokenPriceHistory[
    MAINNET_NETWORK_DETAILS.networkPassphrase
  ]?.native?.[range];

describe("useGetTokenPriceHistory", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockedSend.mockReset();
    mockedEmitMetric.mockReset();
  });

  it("fetches price history through the background chokepoint", async () => {
    mockedSend.mockResolvedValue(okResponse(HISTORY_1D));
    const { rendered } = renderTestHook();

    await act(async () => {
      await rendered.result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(mockedSend).toHaveBeenCalledWith({
      type: SERVICE_TYPES.FETCH_BACKEND_V2,
      activePublicKey: null,
      method: "GET",
      path: "/token-price-history?token=native&network=PUBLIC&range=1D",
    });
    expect(rendered.result.current.state.state).toBe(RequestState.SUCCESS);
    expect(rendered.result.current.state.data?.history).toEqual(HISTORY_1D);
  });

  it("serves an unexpired cached range without a second request", async () => {
    mockedSend.mockResolvedValue(okResponse(HISTORY_1D));
    const { rendered, store } = renderTestHook();

    await act(async () => {
      await rendered.result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });
    expect(mockedSend).toHaveBeenCalledTimes(1);

    // The fetch must have populated the redux session cache.
    const cached =
      store.getState().cache.tokenPriceHistory[
        MAINNET_NETWORK_DETAILS.networkPassphrase
      ].native["1D"];
    expect(cached.points).toEqual(HISTORY_1D.points);
    expect(typeof cached.updatedAt).toBe("number");

    await act(async () => {
      await rendered.result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    // Second render for the same range comes from the cache.
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.state.data?.history).toEqual(HISTORY_1D);
  });

  it("refetches a range past the 5-minute validity window", async () => {
    // Fake clock — no real timers. The entry is stamped just past the window.
    const now = 1_800_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);
    mockedSend.mockResolvedValue(okResponse(HISTORY_1D));

    const { rendered } = renderTestHook({
      tokenPriceHistory: {
        [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
          native: {
            "1D": {
              ...HISTORY_1D,
              points: [{ t: 1, p: "0.000001" }],
              updatedAt: now - PRICE_HISTORY_STALE_MS - 1,
            },
          },
        },
      },
    });

    await act(async () => {
      await rendered.result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.state.data?.history).toEqual(HISTORY_1D);
  });

  it("never serves one network's cache to another network", async () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);
    mockedSend.mockResolvedValue(
      okResponse({ ...HISTORY_1D, points: [{ t: 2, p: "0.5" }] }),
    );

    // Fresh mainnet entry; the request is for testnet.
    const { rendered } = renderTestHook({
      tokenPriceHistory: {
        [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
          native: {
            "1D": { ...HISTORY_1D, updatedAt: now },
          },
        },
      },
    });

    await act(async () => {
      await rendered.result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
    });

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend.mock.calls[0][0].path).toContain("network=TESTNET");
    expect(rendered.result.current.state.data?.history?.points).toEqual([
      { t: 2, p: "0.5" },
    ]);
  });

  it("discards a superseded range's response (the race)", async () => {
    const week = { ...HISTORY_1D, range: "1W", points: [{ t: 10, p: "1" }] };
    const month = { ...HISTORY_1D, range: "1M", points: [{ t: 20, p: "2" }] };

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

    const { rendered } = renderTestHook();

    let weekPromise: Promise<unknown> = Promise.resolve();
    let monthPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      weekPromise = rendered.result.current.fetchData({
        token: "native",
        range: "1W",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
      monthPromise = rendered.result.current.fetchData({
        token: "native",
        range: "1M",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    // 1M (the current range) resolves first; the stale 1W response lands last.
    await act(async () => {
      resolveMonth(okResponse(month));
      await monthPromise;
      resolveWeek(okResponse(week));
      await weekPromise;
    });

    expect(rendered.result.current.state.state).toBe(RequestState.SUCCESS);
    expect(rendered.result.current.state.data?.history).toEqual(month);
    expect(rendered.result.current.state.data?.history?.range).toBe("1M");
  });

  it("joins a second same-key fetch to the one in flight — one request, one write", async () => {
    // Mount fetch for 1D is immediate, not debounced. The user taps away and
    // back before the debounce, queueing a second 1D while the first is still
    // out. The second joins it: the backend (and its quota-metered upstream)
    // sees one request, and there is no older response left to land last.
    const second = {
      ...HISTORY_1D,
      points: [
        { t: 10, p: "2" },
        { t: 20, p: "2" },
      ],
    };
    const resolvers: Array<(v: unknown) => void> = [];
    mockedSend.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { store, rendered } = renderTestHook();
    const q = {
      token: "native",
      range: "1D" as const,
      networkDetails: MAINNET_NETWORK_DETAILS,
    };
    let p1: Promise<unknown> = Promise.resolve();
    let p2: Promise<unknown> = Promise.resolve();
    act(() => {
      p1 = rendered.result.current.fetchData(q);
    });
    act(() => {
      p2 = rendered.result.current.fetchData(q);
    });
    expect(resolvers).toHaveLength(1);

    await act(async () => {
      resolvers[0](okResponse(second));
      await Promise.all([p1, p2]);
    });

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(cachedEntry(store, "1D")?.points).toEqual(second.points);
    expect(rendered.result.current.state.data?.history).toEqual(second);
  });

  it("degrades a fetch error to null history", async () => {
    mockedSend.mockResolvedValue({ status: 503, body: { error: "down" } });
    const { rendered } = renderTestHook();

    await act(async () => {
      await rendered.result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(rendered.result.current.state.state).toBe(RequestState.SUCCESS);
    expect(rendered.result.current.state.data?.history).toBeNull();
  });

  // `warmRange` is the background-warming transport: same request, same cache,
  // but deliberately none of `fetchData`'s user-facing side effects.
  describe("warmRange", () => {
    it("populates the cache without touching the request state", async () => {
      mockedSend.mockResolvedValue(okResponse(HISTORY_1W));
      const { rendered, store } = renderTestHook();

      await act(async () => {
        await rendered.result.current.warmRange({
          token: "native",
          range: "1W",
          networkDetails: MAINNET_NETWORK_DETAILS,
        });
      });

      // The entry the switch path will read is there, stamped like any other.
      expect(cachedEntry(store, "1W").points).toEqual(HISTORY_1W.points);
      expect(typeof cachedEntry(store, "1W").updatedAt).toBe("number");

      // ...and nothing the chart renders off has moved: still IDLE, no data,
      // so the displayed range, delta, notice and loading state are untouched.
      expect(rendered.result.current.state).toEqual({
        state: RequestState.IDLE,
        data: null,
        error: null,
      });
    });

    it("emits no analytics — a warmed range is not an outcome", async () => {
      mockedSend.mockResolvedValue(okResponse(HISTORY_1W));
      const { rendered } = renderTestHook();

      await act(async () => {
        await rendered.result.current.warmRange({
          token: "native",
          range: "1W",
          networkDetails: MAINNET_NETWORK_DETAILS,
        });
      });

      // `token_chart.loaded` means "the user was shown this range". Nobody was
      // shown anything here, so emitting would inflate the event six-fold per
      // screen open and destroy the empty-state rate.
      expect(mockedEmitMetric).not.toHaveBeenCalled();
    });

    it("skips a range already valid in the cache", async () => {
      const now = 1_800_000_000_000;
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockedSend.mockResolvedValue(okResponse(HISTORY_1W));

      const { rendered } = renderTestHook({
        tokenPriceHistory: {
          [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
            native: { "1W": { ...HISTORY_1W, updatedAt: now } },
          },
        },
      });

      await act(async () => {
        await rendered.result.current.warmRange({
          token: "native",
          range: "1W",
          networkDetails: MAINNET_NETWORK_DETAILS,
        });
      });

      expect(mockedSend).not.toHaveBeenCalled();
    });

    it("joins an in-flight warm request for the same range instead of refetching", async () => {
      let resolveWeek: (v: unknown) => void = () => {};
      mockedSend.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveWeek = resolve;
          }),
      );
      const { rendered } = renderTestHook();
      const query = {
        token: "native",
        range: "1W" as const,
        networkDetails: MAINNET_NETWORK_DETAILS,
      };

      let warm: Promise<unknown> = Promise.resolve();
      let fetch: Promise<unknown> = Promise.resolve();
      act(() => {
        warm = rendered.result.current.warmRange(query);
        fetch = rendered.result.current.fetchData(query);
      });
      await act(async () => {
        resolveWeek(okResponse(HISTORY_1W));
        await Promise.all([warm, fetch]);
      });

      expect(mockedSend).toHaveBeenCalledTimes(1);
      expect(rendered.result.current.state.data?.history).toEqual(HISTORY_1W);
    });

    it("never supersedes the user's in-flight fetch", async () => {
      // The race guard is a monotonic tag that `fetchData` bumps. Warming must
      // not bump it: a warm response landing mid-fetch would otherwise make
      // the user's own response look superseded and get discarded.
      let resolveDay: (v: unknown) => void = () => {};
      mockedSend.mockImplementation(({ path }: { path: string }) =>
        path.includes("range=1D")
          ? new Promise((resolve) => {
              resolveDay = resolve;
            })
          : Promise.resolve(okResponse(HISTORY_1W)),
      );

      const { rendered } = renderTestHook();

      let dayPromise: Promise<unknown> = Promise.resolve();
      act(() => {
        dayPromise = rendered.result.current.fetchData({
          token: "native",
          range: "1D",
          networkDetails: MAINNET_NETWORK_DETAILS,
        });
      });

      await act(async () => {
        await rendered.result.current.warmRange({
          token: "native",
          range: "1W",
          networkDetails: MAINNET_NETWORK_DETAILS,
        });
        resolveDay(okResponse(HISTORY_1D));
        await dayPromise;
      });

      expect(rendered.result.current.state.state).toBe(RequestState.SUCCESS);
      expect(rendered.result.current.state.data?.history).toEqual(HISTORY_1D);
      expect(rendered.result.current.state.data?.range).toBe("1D");
    });
  });
});
