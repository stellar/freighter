import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import {
  useGetBalances,
  RequestState,
  AccountBalances,
} from "../hooks/useGetBalances";
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
        [TESTNET_NETWORK_DETAILS.network]: {
          [publicKey]: { ...cachedBalanceData, updatedAt: Date.now() },
        },
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

  it("skips trying to lookup an icon that was previously not found", async () => {
    const preloadedStateWithNullIcon = {
      cache: {
        balanceData: {
          [TESTNET_NETWORK_DETAILS.network]: {
            [publicKey]: { ...cachedBalanceData, updatedAt: Date.now() },
          },
        },
        icons: { "XLM:GABCDEF": null },
        tokenLists: tokenListData,
      },
      settings: {
        assetsLists: [],
      },
    };
    const iconStore = makeDummyStore(preloadedStateWithNullIcon);

    const { result } = renderHook(
      () => useGetBalances({ showHidden: false, includeIcons: true }),
      { wrapper: Wrapper(iconStore) },
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
    expect(getIconUrlFromIssuer).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });
});

describe("useGetBalances (flag routing)", () => {
  const publicKey = TEST_PUBLIC_KEY;

  const makeFlagStore = (useBalancesV2: boolean) =>
    makeDummyStore({
      cache: { balanceData: {}, icons: {}, tokenLists: [] },
      settings: { assetsLists: [] },
      remoteConfig: {
        isInitialized: true,
        use_token_prices_v2: true,
        use_balances_v2: useBalancesV2,
        earn_deposit: false,
        maintenance_banner: { enabled: false, payload: undefined },
        maintenance_screen: { enabled: false, payload: undefined },
      },
    });

  const Wrapper =
    (store: ReturnType<typeof makeDummyStore>) =>
    ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

  beforeEach(() => {
    (getAccountBalances as jest.Mock).mockReset();
    (getAccountBalances as jest.Mock).mockResolvedValue({
      isFunded: true,
      subentryCount: 0,
      balances: {},
    });
  });

  it("passes useV2: true to getAccountBalances when the flag is on", async () => {
    const { result } = renderHook(
      () => useGetBalances({ showHidden: false, includeIcons: false }),
      { wrapper: Wrapper(makeFlagStore(true)) },
    );

    await act(async () => {
      await result.current.fetchData(
        publicKey,
        true,
        TESTNET_NETWORK_DETAILS,
        false,
      );
    });

    expect(getAccountBalances).toHaveBeenCalledWith(
      publicKey,
      TESTNET_NETWORK_DETAILS,
      true,
      false,
      true,
    );
  });

  it("passes useV2: false to getAccountBalances when the flag is off", async () => {
    const { result } = renderHook(
      () => useGetBalances({ showHidden: false, includeIcons: false }),
      { wrapper: Wrapper(makeFlagStore(false)) },
    );

    await act(async () => {
      await result.current.fetchData(
        publicKey,
        true,
        TESTNET_NETWORK_DETAILS,
        false,
      );
    });

    expect(getAccountBalances).toHaveBeenCalledWith(
      publicKey,
      TESTNET_NETWORK_DETAILS,
      true,
      false,
      false,
    );
  });

  it("passes localOnlyTokenIds through to the payload", async () => {
    const localOnlyTokenIds = ["CLOCALTOKENCONTRACTID"];
    (getAccountBalances as jest.Mock).mockResolvedValue({
      isFunded: true,
      subentryCount: 0,
      balances: {},
      localOnlyTokenIds,
    });

    const { result } = renderHook(
      () => useGetBalances({ showHidden: false, includeIcons: false }),
      { wrapper: Wrapper(makeFlagStore(true)) },
    );

    await act(async () => {
      const payload = await result.current.fetchData(
        publicKey,
        true,
        TESTNET_NETWORK_DETAILS,
        false,
      );
      // Manage Assets reads this off the payload to decide whether a custom
      // token may be removed rather than only hidden.
      expect((payload as AccountBalances).localOnlyTokenIds).toEqual(
        localOnlyTokenIds,
      );
    });
  });
});
