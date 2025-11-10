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
    jest.clearAllMocks();
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
});
