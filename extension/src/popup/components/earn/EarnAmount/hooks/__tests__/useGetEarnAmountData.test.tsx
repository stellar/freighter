import React from "react";
import { act, renderHook } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
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

jest.mock("helpers/hooks/useGetBalances", () => ({
  ...jest.requireActual("helpers/hooks/useGetBalances"),
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
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
});
