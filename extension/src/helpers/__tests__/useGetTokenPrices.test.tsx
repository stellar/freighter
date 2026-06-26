import React from "react";
import BigNumber from "bignumber.js";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import { useGetTokenPrices } from "../hooks/useGetTokenPrices";
import { makeDummyStore } from "popup/__testHelpers__";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import { RequestState } from "constants/request";
import * as ApiInternal from "@shared/api/internal";

describe("useGetTokenPrices", () => {
  afterEach(() => {
    // restore (not just clear) so an unconsumed mockImplementationOnce from a
    // cache-hit test doesn't leak its queued impl into the next test.
    jest.restoreAllMocks();
  });
  it("should return token prices from API with no cache", async () => {
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementationOnce(() =>
        Promise.resolve({
          native: {
            currentPrice: "1",
            percentagePriceChange24h: ".5",
          },
        }),
      );
    const preloadedState = {
      cache: {
        tokenPrices: {},
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetTokenPrices(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData({
        publicKey: "G123",
        balances: [
          {
            token: { type: "native", code: "XLM" },
            total: new BigNumber("50"),
            available: new BigNumber("50"),
            blockaidData: defaultBlockaidScanAssetResult,
          },
        ],
      } as any);
    });
    expect(getTokenPricesSpy).toHaveBeenCalledWith(["native"]);
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(result.current.state.data?.tokenPrices).toEqual({
      native: {
        currentPrice: "1",
        percentagePriceChange24h: ".5",
      },
    });
  });
  it("should return token prices from API with expired cache", async () => {
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementationOnce(() =>
        Promise.resolve({
          native: {
            currentPrice: "1",
            percentagePriceChange24h: ".5",
          },
        }),
      );
    const preloadedState = {
      cache: {
        tokenPrices: {
          G123: {
            native: {
              currentPrice: "1",
              percentagePriceChange24h: ".5",
            },
            updatedAt: Date.now() - 60000,
          },
        },
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetTokenPrices(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData({
        publicKey: "G123",
        balances: [
          {
            token: { type: "native", code: "XLM" },
            total: new BigNumber("50"),
            available: new BigNumber("50"),
            blockaidData: defaultBlockaidScanAssetResult,
          },
        ],
      } as any);
    });
    expect(getTokenPricesSpy).toHaveBeenCalledWith(["native"]);
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(result.current.state.data?.tokenPrices).toEqual({
      native: {
        currentPrice: "1",
        percentagePriceChange24h: ".5",
      },
    });
  });
  it("should return token prices from cache", async () => {
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementationOnce(() =>
        Promise.resolve({
          native: {
            currentPrice: "2",
            percentagePriceChange24h: ".75",
          },
        }),
      );
    const preloadedState = {
      cache: {
        tokenPrices: {
          G123: {
            native: {
              currentPrice: "1",
              percentagePriceChange24h: ".5",
            },
            updatedAt: Date.now(),
          },
        },
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetTokenPrices(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData({
        publicKey: "G123",
        balances: [
          {
            token: { type: "native", code: "XLM" },
            total: new BigNumber("50"),
            available: new BigNumber("50"),
            blockaidData: defaultBlockaidScanAssetResult,
          },
        ],
        useCache: true,
      } as any);
    });
    expect(getTokenPricesSpy).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(result.current.state.data?.tokenPrices).toEqual({
      native: {
        currentPrice: "1",
        percentagePriceChange24h: ".5",
      },
    });
  });
  it("should return no token prices for no balances", async () => {
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementationOnce(() =>
        Promise.resolve({
          native: {
            currentPrice: "2",
            percentagePriceChange24h: ".75",
          },
        }),
      );
    const preloadedState = {
      cache: {
        tokenPrices: {},
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetTokenPrices(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData({
        publicKey: "G123",
        balances: [],
      } as any);
    });
    expect(getTokenPricesSpy).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(result.current.state.data?.tokenPrices).toEqual({});
  });
  it("fetches a missing additionalAssetId separately and merges it with cached balance prices", async () => {
    // The separate extra-fetch returns only the destination price.
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementationOnce(() =>
        Promise.resolve({
          "USDC:GUSD": { currentPrice: "1", percentagePriceChange24h: "0" },
        }),
      );
    // Valid cache that only covers native — the extra destination id is missing.
    const preloadedState = {
      cache: {
        tokenPrices: {
          G123: {
            native: { currentPrice: "1", percentagePriceChange24h: ".5" },
            updatedAt: Date.now(),
          },
        },
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetTokenPrices(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData({
        publicKey: "G123",
        balances: [
          {
            token: { type: "native", code: "XLM" },
            total: new BigNumber("50"),
            available: new BigNumber("50"),
            blockaidData: defaultBlockaidScanAssetResult,
          },
        ],
        useCache: true,
        additionalAssetIds: ["USDC:GUSD"],
      } as any);
    });
    // Balance prices came from cache; only the missing destination was fetched.
    expect(getTokenPricesSpy).toHaveBeenCalledWith(["USDC:GUSD"]);
    expect(result.current.state.data?.tokenPrices).toEqual({
      native: { currentPrice: "1", percentagePriceChange24h: ".5" },
      "USDC:GUSD": { currentPrice: "1", percentagePriceChange24h: "0" },
    });
  });
  it("keeps the balance prices when the additionalAssetIds fetch fails", async () => {
    // First call (balances) succeeds; the separate extra-fetch rejects.
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementationOnce(() =>
        Promise.resolve({
          native: { currentPrice: "1", percentagePriceChange24h: ".5" },
        }),
      )
      .mockImplementationOnce(() => Promise.reject(new Error("boom")));
    const preloadedState = { cache: { tokenPrices: {} } };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetTokenPrices(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData({
        publicKey: "G123",
        balances: [
          {
            token: { type: "native", code: "XLM" },
            total: new BigNumber("50"),
            available: new BigNumber("50"),
            blockaidData: defaultBlockaidScanAssetResult,
          },
        ],
        useCache: true,
        additionalAssetIds: ["USDC:GUSD"],
      } as any);
    });
    // The destination fetch failing must NOT wipe the balance prices.
    expect(getTokenPricesSpy).toHaveBeenNthCalledWith(1, ["native"]);
    expect(getTokenPricesSpy).toHaveBeenNthCalledWith(2, ["USDC:GUSD"]);
    expect(result.current.state.data?.tokenPrices).toEqual({
      native: { currentPrice: "1", percentagePriceChange24h: ".5" },
    });
  });
  it("uses the cache when the additionalAssetIds are already cached", async () => {
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementationOnce(() =>
        Promise.resolve({
          native: { currentPrice: "9", percentagePriceChange24h: "9" },
        }),
      );
    const preloadedState = {
      cache: {
        tokenPrices: {
          G123: {
            native: { currentPrice: "1", percentagePriceChange24h: ".5" },
            "USDC:GUSD": { currentPrice: "1", percentagePriceChange24h: "0" },
            updatedAt: Date.now(),
          },
        },
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetTokenPrices(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData({
        publicKey: "G123",
        balances: [
          {
            token: { type: "native", code: "XLM" },
            total: new BigNumber("50"),
            available: new BigNumber("50"),
            blockaidData: defaultBlockaidScanAssetResult,
          },
        ],
        useCache: true,
        additionalAssetIds: ["USDC:GUSD"],
      } as any);
    });
    expect(getTokenPricesSpy).not.toHaveBeenCalled();
  });
});
