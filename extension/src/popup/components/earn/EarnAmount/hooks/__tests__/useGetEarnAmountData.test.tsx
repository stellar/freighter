import React from "react";
import { act, renderHook } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import {
  ResolvedEarnAmount,
  useGetEarnAmountData,
} from "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData";

const mockFetchAppData = jest.fn();
const mockFetchBalances = jest.fn();
const mockFetchTokenPrices = jest.fn();

jest.mock("helpers/hooks/useGetAppData", () => ({
  ...jest.requireActual("helpers/hooks/useGetAppData"),
  useGetAppData: () => ({ fetchData: mockFetchAppData }),
}));

const mockUseGetBalancesOptions = jest.fn();
jest.mock("helpers/hooks/useGetBalances", () => ({
  ...jest.requireActual("helpers/hooks/useGetBalances"),
  useGetBalances: (options: unknown) => {
    mockUseGetBalancesOptions(options);
    return { fetchData: mockFetchBalances };
  },
}));

jest.mock("helpers/hooks/useGetTokenPrices", () => ({
  ...jest.requireActual("helpers/hooks/useGetTokenPrices"),
  useGetTokenPrices: () => ({ fetchData: mockFetchTokenPrices }),
}));

const balances = {
  balances: [
    { token: { type: "native", code: "XLM" }, total: new BigNumber("100") },
  ],
  isFunded: true,
  subentryCount: 0,
  icons: {},
};

const fetchResolved = async () => {
  const { result } = renderData();
  let data: ResolvedEarnAmount | undefined;
  await act(async () => {
    data = (await result.current.fetchData()) as ResolvedEarnAmount;
  });
  return data!;
};

const renderData = () =>
  renderHook(() => useGetEarnAmountData(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Wrapper
        routes={["/earn"]}
        state={{ settings: { networkDetails: TESTNET_NETWORK_DETAILS } }}
      >
        {children}
      </Wrapper>
    ),
  });

describe("useGetEarnAmountData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAppData.mockResolvedValue({
      type: AppDataType.RESOLVED,
      account: { publicKey: "G123" },
      settings: { networkDetails: TESTNET_NETWORK_DETAILS },
    });
    mockFetchBalances.mockResolvedValue(balances);
  });

  // Earn's picker lists a token hidden on Home at its balance, so the deposit
  // screen must see that balance too.
  it("loads balances with hidden tokens included", async () => {
    mockFetchTokenPrices.mockResolvedValue({ tokenPrices: {} });
    await fetchResolved();

    expect(mockUseGetBalancesOptions).toHaveBeenCalledWith(
      expect.objectContaining({ showHidden: true }),
    );
  });

  it("passes the fetched prices through", async () => {
    const tokenPrices = {
      native: { currentPrice: "0.25", percentagePriceChange24h: null },
    };
    mockFetchTokenPrices.mockResolvedValue({ tokenPrices });
    const data = await fetchResolved();

    expect(data.tokenPrices).toEqual(tokenPrices);
  });

  // The price hook reports a failed, uncached fetch as null. The amount screen
  // indexes the prices directly, so a null here would throw during render.
  it("returns an empty price map when the price fetch failed", async () => {
    mockFetchTokenPrices.mockResolvedValue({ tokenPrices: null });
    const data = await fetchResolved();

    expect(data.tokenPrices).toEqual({});
  });

  it("reports an error when the first load fails", async () => {
    mockFetchBalances.mockRejectedValue(new Error("network down"));
    const { result } = renderData();

    await act(async () => {
      await expect(result.current.fetchData()).rejects.toThrow();
    });

    expect(result.current.state.state).toBe(RequestState.ERROR);
  });

  // A swap makes the screen load again while it may be the one showing, with
  // the review sheet open over it. A loader in its place would close that
  // sheet, so the loaded balances stay until the new ones land.
  describe("a refresh after the first load", () => {
    const refreshedBalances = {
      ...balances,
      balances: [
        { token: { type: "native", code: "XLM" }, total: new BigNumber("40") },
      ],
    };

    const loadOnce = async () => {
      mockFetchTokenPrices.mockResolvedValue({ tokenPrices: {} });
      const rendered = renderData();
      await act(async () => {
        await rendered.result.current.fetchData();
      });
      return rendered;
    };

    it("keeps the loaded balances until the new ones land", async () => {
      const { result } = await loadOnce();
      let resolveBalances: (value: unknown) => void = () => {};
      mockFetchBalances.mockReturnValue(
        new Promise((resolve) => {
          resolveBalances = resolve;
        }),
      );

      let refresh: Promise<unknown> = Promise.resolve();
      act(() => {
        refresh = result.current.fetchData();
      });
      expect(result.current.state.state).toBe(RequestState.SUCCESS);
      expect(
        (result.current.state.data as ResolvedEarnAmount).balances,
      ).toEqual(balances);

      await act(async () => {
        resolveBalances(refreshedBalances);
        await refresh;
      });
      expect(
        (result.current.state.data as ResolvedEarnAmount).balances,
      ).toEqual(refreshedBalances);
    });

    it("keeps the loaded balances when it fails", async () => {
      const { result } = await loadOnce();
      mockFetchBalances.mockRejectedValue(new Error("network down"));

      await act(async () => {
        await expect(result.current.fetchData()).rejects.toThrow();
      });

      expect(result.current.state.state).toBe(RequestState.SUCCESS);
      expect(
        (result.current.state.data as ResolvedEarnAmount).balances,
      ).toEqual(balances);
    });
  });
});
