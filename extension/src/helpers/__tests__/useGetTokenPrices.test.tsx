import React from "react";
import BigNumber from "bignumber.js";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import { useGetTokenPrices } from "../hooks/useGetTokenPrices";
import { makeDummyStore } from "popup/__testHelpers__";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import { RequestState } from "constants/request";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";

describe("useGetTokenPrices", () => {
  afterEach(() => {
    // restore (not just clear) so unconsumed mockImplementationOnce calls don't leak into the next test.
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
        networkDetails: MAINNET_NETWORK_DETAILS,
      } as any);
    });
    expect(getTokenPricesSpy).toHaveBeenCalledWith(
      ["native"],
      MAINNET_NETWORK_DETAILS,
      true,
    );
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
          [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
            G123: {
              native: {
                currentPrice: "1",
                percentagePriceChange24h: ".5",
              },
              updatedAt: Date.now() - 60000,
            },
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
        networkDetails: MAINNET_NETWORK_DETAILS,
      } as any);
    });
    expect(getTokenPricesSpy).toHaveBeenCalledWith(
      ["native"],
      MAINNET_NETWORK_DETAILS,
      true,
    );
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
          [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
            G123: {
              native: {
                currentPrice: "1",
                percentagePriceChange24h: ".5",
              },
              updatedAt: Date.now(),
            },
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
        networkDetails: MAINNET_NETWORK_DETAILS,
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
  it("does not reuse another network's cache for the same account", async () => {
    // Cache holds a fresh PUBLIC entry for G123. A cached request on TESTNET
    // for the same account must ignore it and hit the network.
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
          [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
            G123: {
              native: {
                currentPrice: "1",
                percentagePriceChange24h: ".5",
              },
              updatedAt: Date.now(),
            },
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
        networkDetails: TESTNET_NETWORK_DETAILS,
        useCache: true,
      } as any);
    });
    expect(getTokenPricesSpy).toHaveBeenCalledWith(
      ["native"],
      TESTNET_NETWORK_DETAILS,
      true,
    );
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(result.current.state.data?.tokenPrices).toEqual({
      native: {
        currentPrice: "2",
        percentagePriceChange24h: ".75",
      },
    });
  });
  it("does not reuse one custom network's cache for another", async () => {
    // Both custom networks share the STANDALONE network value but differ by
    // passphrase. A fresh entry cached for the pubnet-passphrase custom network
    // must not be reused for a testnet-passphrase custom network.
    const customPubnet = {
      ...MAINNET_NETWORK_DETAILS,
      network: "STANDALONE",
      networkName: "Custom Pubnet",
    };
    const customTestnet = {
      ...TESTNET_NETWORK_DETAILS,
      network: "STANDALONE",
      networkName: "Custom Testnet",
    };
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
          [customPubnet.networkPassphrase]: {
            G123: {
              native: {
                currentPrice: "1",
                percentagePriceChange24h: ".5",
              },
              updatedAt: Date.now(),
            },
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
        networkDetails: customTestnet,
        useCache: true,
      } as any);
    });
    expect(getTokenPricesSpy).toHaveBeenCalledWith(
      ["native"],
      customTestnet,
      true,
    );
    expect(result.current.state.data?.tokenPrices).toEqual({
      native: {
        currentPrice: "2",
        percentagePriceChange24h: ".75",
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
        networkDetails: MAINNET_NETWORK_DETAILS,
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
          [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
            G123: {
              native: { currentPrice: "1", percentagePriceChange24h: ".5" },
              updatedAt: Date.now(),
            },
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
        networkDetails: MAINNET_NETWORK_DETAILS,
      } as any);
    });
    // Balance prices came from cache; only the missing destination was fetched.
    expect(getTokenPricesSpy).toHaveBeenCalledWith(
      ["USDC:GUSD"],
      MAINNET_NETWORK_DETAILS,
      true,
    );
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
        networkDetails: MAINNET_NETWORK_DETAILS,
      } as any);
    });
    // The destination fetch failing must NOT wipe the balance prices.
    expect(getTokenPricesSpy).toHaveBeenNthCalledWith(
      1,
      ["native"],
      MAINNET_NETWORK_DETAILS,
      true,
    );
    expect(getTokenPricesSpy).toHaveBeenNthCalledWith(
      2,
      ["USDC:GUSD"],
      MAINNET_NETWORK_DETAILS,
      true,
    );
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
          [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
            G123: {
              native: { currentPrice: "1", percentagePriceChange24h: ".5" },
              "USDC:GUSD": { currentPrice: "1", percentagePriceChange24h: "0" },
              updatedAt: Date.now(),
            },
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
        networkDetails: MAINNET_NETWORK_DETAILS,
      } as any);
    });
    expect(getTokenPricesSpy).not.toHaveBeenCalled();
  });
});
