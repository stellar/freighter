import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import { useGetWalletsData } from "../useGetWalletsData";
import {
  makeDummyStore,
  mockBalances,
  TEST_CANONICAL,
  TEST_PUBLIC_KEY,
  mockAccounts,
} from "popup/__testHelpers__";
import { RequestState } from "constants/request";
import * as ApiInternal from "@shared/api/internal";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getAccountBalances: jest.fn(),
  getAssetIcons: jest.fn().mockResolvedValue({}),
  getHiddenAssets: jest.fn().mockResolvedValue({ hiddenAssets: [] }),
  getAssetDomains: jest.fn().mockResolvedValue({
    GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM: "example2.com",
  }),
  getTokenPrices: jest.fn().mockResolvedValue({
    native: {
      currentPrice: "1",
      percentagePriceChange24h: ".5",
    },
    "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ": {
      currentPrice: "2",
      percentagePriceChange24h: ".25",
    },
  }),
}));

describe("useGetWalletsData", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  const publicKey = TEST_PUBLIC_KEY;

  const cachedBalanceData = {
    isFunded: true,
    subentryCount: 3,
    error: undefined,
    balances: mockBalances.balances,
  };

  const tokenListData = [{ id: "example-token-list" }];
  const canonicalKey = "XLM:GABCDEF";
  const cachedIcons = {
    [canonicalKey]: "https://cached/icon/url.png",
  };

  const testCanonicalIssuer = TEST_CANONICAL.split(":")[1];
  const preloadedState = {
    auth: {
      publicKey: TEST_PUBLIC_KEY,
      allAccounts: mockAccounts,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    },
    cache: {
      balanceData: {
        [TESTNET_NETWORK_DETAILS.network]: { [publicKey]: cachedBalanceData },
      },
      icons: cachedIcons,
      tokenLists: tokenListData,
      homeDomains: {
        [testCanonicalIssuer]: "example.com",
        GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM: "example.com",
      },
    },
    settings: {
      assetsLists: [],
      networkDetails: TESTNET_NETWORK_DETAILS,
    },
  };

  it("should return wallets data on Testnet", async () => {
    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetWalletsData(), {
      wrapper: Wrapper(store),
    });
    await act(async () => {
      await result.current.fetchData();
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(result.current.state.data).toEqual({
      publicKey,
      allAccounts: mockAccounts,
      isFetchingTokenPrices: false,
      type: AppDataType.RESOLVED,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    });
  });
  it("should return wallets data and token prices on Mainnet", async () => {
    const mainnetPreloadedState = {
      auth: {
        publicKey: "G1",
        allAccounts: [{ publicKey: "G1" }],
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      },
      cache: {
        balanceData: {
          [MAINNET_NETWORK_DETAILS.network]: {
            ["G1"]: { ...cachedBalanceData, updatedAt: Date.now() },
          },
        },
        icons: cachedIcons,
        tokenLists: tokenListData,
        homeDomains: {
          [testCanonicalIssuer]: "example.com",
          GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM:
            "example.com",
        },
        tokenPrices: {},
      },
      settings: {
        assetsLists: [],
        networkDetails: MAINNET_NETWORK_DETAILS,
      },
    };
    const store = makeDummyStore(mainnetPreloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetWalletsData(), {
      wrapper: Wrapper(store),
    });
    await act(async () => {
      await result.current.fetchData(true);
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(result.current.state.data).toEqual({
      accountValue: {
        G1: "$50.00",
      },
      publicKey: "G1",
      allAccounts: [{ publicKey: "G1" }],
      isFetchingTokenPrices: false,
      type: AppDataType.RESOLVED,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    });
  });
  it("should return wallets data and token prices on Mainnet in batches", async () => {
    const getTokenPricesSpy = jest.spyOn(ApiInternal, "getTokenPrices");
    const mainnetPreloadedState = {
      auth: {
        publicKey: "G1",
        allAccounts: [
          { publicKey: "G1" },
          { publicKey: "G2" },
          { publicKey: "G3" },
          { publicKey: "G4" },
          { publicKey: "G5" },
          { publicKey: "G6" },
          { publicKey: "G7" },
        ],
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      },
      cache: {
        balanceData: {
          [MAINNET_NETWORK_DETAILS.network]: {
            ["G1"]: { ...cachedBalanceData, updatedAt: Date.now() },
            ["G2"]: { ...cachedBalanceData, updatedAt: Date.now() },
            ["G3"]: { ...cachedBalanceData, updatedAt: Date.now() },
            ["G4"]: { ...cachedBalanceData, updatedAt: Date.now() },
            ["G5"]: { ...cachedBalanceData, updatedAt: Date.now() },
            ["G6"]: { ...cachedBalanceData, updatedAt: Date.now() },
            ["G7"]: { ...cachedBalanceData, updatedAt: Date.now() },
          },
        },
        icons: cachedIcons,
        tokenLists: tokenListData,
        homeDomains: {
          [testCanonicalIssuer]: "example.com",
          GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM:
            "example.com",
        },
        tokenPrices: {},
      },
      settings: {
        assetsLists: [],
        networkDetails: MAINNET_NETWORK_DETAILS,
      },
    };
    const store = makeDummyStore(mainnetPreloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(() => useGetWalletsData(), {
      wrapper: Wrapper(store),
    });

    await act(async () => {
      await result.current.fetchData(true);
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(getTokenPricesSpy).toHaveBeenCalledWith([
      "native",
      "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
    ]);
    expect(result.current.state.data).toEqual({
      accountValue: {
        G1: "$50.00",
        G2: "$50.00",
        G3: "$50.00",
        G4: "$50.00",
        G5: "$50.00",
        G6: "$50.00",
        G7: "$50.00",
      },
      publicKey: "G1",
      allAccounts: [
        { publicKey: "G1" },
        { publicKey: "G2" },
        { publicKey: "G3" },
        { publicKey: "G4" },
        { publicKey: "G5" },
        { publicKey: "G6" },
        { publicKey: "G7" },
      ],
      isFetchingTokenPrices: false,
      type: AppDataType.RESOLVED,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    });
  });
});
