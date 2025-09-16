import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import { useGetBalances, RequestState } from "../hooks/useGetBalances";
import { getAccountBalances } from "@shared/api/internal";
import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getAccountBalances: jest.fn(),
  getHiddenAssets: jest.fn().mockResolvedValue({ hiddenAssets: [] }),
}));
jest.mock("@shared/api/helpers/getIconUrlFromIssuer", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getIconUrlFromIssuer: jest.fn(),
}));
jest.mock("@shared/api/helpers/token-list", () => ({
  getCombinedAssetListData: jest.fn().mockResolvedValue([]),
}));
jest.mock("popup/helpers/account", () => ({
  sortBalances: (b: any) => b,
  filterHiddenBalances: (_b: any) => _b,
}));

describe("useGetBalances (cached path)", () => {
  const publicKey = TEST_PUBLIC_KEY;

  const cachedBalanceData = {
    isFunded: true,
    subentryCount: 3,
    error: undefined,
    balances: {
      native: {
        asset_type: "native",
        balance: "123.0000000",
        token: {
          code: "XLM",
          issuer: { key: "GABCDEF" },
        },
      },
    },
  };

  const tokenListData = [{ id: "example-token-list" }];
  const canonicalKey = "XLM:GABCDEF";
  const cachedIcons = {
    [canonicalKey]: "https://cached/icon/url.png",
  };

  const preloadedState = {
    cache: {
      balanceData: {
        [TESTNET_NETWORK_DETAILS.network]: { [publicKey]: cachedBalanceData },
      },
      icons: cachedIcons,
      tokenLists: tokenListData,
    },
    settings: {
      assetsLists: [],
    },
  };

  const store = makeDummyStore(preloadedState);
  const Wrapper =
    (store: ReturnType<typeof makeDummyStore>) =>
    ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

  it("serves balances from the cache and skips the API call", async () => {
    const { result } = renderHook(
      () => useGetBalances({ showHidden: false, includeIcons: false }),
      { wrapper: Wrapper(store) },
    );

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData(
        publicKey,
        true,
        TESTNET_NETWORK_DETAILS,
        true,
      );
    });

    expect(payload).toMatchObject({
      balances: cachedBalanceData.balances,
      isFunded: cachedBalanceData.isFunded,
      subentryCount: cachedBalanceData.subentryCount,
    });

    expect(getAccountBalances).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });

  it("serves icons from the cache and skips the API call", async () => {
    const { result } = renderHook(
      () => useGetBalances({ showHidden: false, includeIcons: true }),
      { wrapper: Wrapper(store) },
    );

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData(
        publicKey,
        true,
        TESTNET_NETWORK_DETAILS,
        true,
      );
    });

    expect(payload.icons[canonicalKey]).toBe(cachedIcons[canonicalKey]);

    expect(getAccountBalances).not.toHaveBeenCalled();
    expect(getIconUrlFromIssuer).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });

  it("serves token lists from the cache and skips the API calls", async () => {
    const { result } = renderHook(
      () => useGetBalances({ showHidden: false, includeIcons: true }),
      { wrapper: Wrapper(store) },
    );

    await act(async () => {
      await result.current.fetchData(
        publicKey,
        true,
        TESTNET_NETWORK_DETAILS,
        true,
      );
    });

    expect(getCombinedAssetListData).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });
});
