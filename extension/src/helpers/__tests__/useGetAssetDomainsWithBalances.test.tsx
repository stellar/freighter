import React from "react";
import { Provider } from "react-redux";
import { useLocation } from "react-router-dom";
import { renderHook, act } from "@testing-library/react";
import BigNumber from "bignumber.js";
import { useGetAssetDomainsWithBalances } from "../hooks/useGetAssetDomainsWithBalances";
import {
  makeDummyStore,
  mockBalances,
  TEST_CANONICAL,
  TEST_PUBLIC_KEY,
} from "popup/__testHelpers__";
import { RequestState } from "constants/request";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getAssetDomains } from "@shared/api/internal";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import {
  AssetSelectType,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getAccountBalances: jest.fn(),
  getAssetIcons: jest.fn().mockResolvedValue({}),
  getHiddenAssets: jest.fn().mockResolvedValue({ hiddenAssets: [] }),
  getAssetDomains: jest.fn().mockResolvedValue({
    GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM: "example2.com",
  }),
}));
jest.mock("@shared/api/helpers/getIconUrlFromIssuer", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getIconUrlFromIssuer: jest.fn(),
}));
jest.mock("@shared/api/helpers/token-list", () => ({
  getCombinedAssetListData: jest.fn().mockResolvedValue([]),
}));
jest.mock("popup/helpers/account", () => ({
  sortBalances: (balances: any) => {
    if (!balances) return [];
    const result = [];
    // Put native (XLM) first
    if (balances.native) {
      result.push(balances.native);
    }
    // Then add all other assets
    Object.entries(balances).forEach(([key, value]) => {
      if (key !== "native") {
        result.push(value);
      }
    });
    return result;
  },
  filterHiddenBalances: (_b: any) => _b,
}));
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(),
}));

describe("useGetAssetDomainsWithBalances (cached path)", () => {
  (useLocation as jest.Mock).mockReturnValue({
    pathname: "/test-path",
    search: "?query=test",
    state: { from: "test" },
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
      hasPrivateKey: true,
    },
    cache: {
      balanceData: {
        [TESTNET_NETWORK_DETAILS.network]: {
          [publicKey]: { ...cachedBalanceData, updatedAt: Date.now() },
        },
      },
      icons: cachedIcons,
      tokenLists: tokenListData,
      homeDomains: {
        [TESTNET_NETWORK_DETAILS.network]: {
          [testCanonicalIssuer]: "example.com",
          GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM:
            "example.com",
        },
      },
    },
    settings: {
      assetsLists: [],
      networkDetails: TESTNET_NETWORK_DETAILS,
    },
  };

  const store = makeDummyStore(preloadedState);

  it("serves domains from the cache and skips the API call", async () => {
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(
      () =>
        useGetAssetDomainsWithBalances({
          showHidden: false,
          includeIcons: false,
        }),
      { wrapper: Wrapper(store) },
    );

    await act(async () => {
      await result.current.fetchData(true);
    });

    expect(getAssetDomains).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });
  it("serves some domains from the cache and backfills using the API", async () => {
    const partialCachedState = {
      ...preloadedState,
      cache: {
        ...preloadedState.cache,
        homeDomains: {
          [TESTNET_NETWORK_DETAILS.network]: {
            [testCanonicalIssuer]: "example.com",
          },
        },
      },
    };

    const store = makeDummyStore(partialCachedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(
      () =>
        useGetAssetDomainsWithBalances({
          showHidden: false,
          includeIcons: false,
        }),
      { wrapper: Wrapper(store) },
    );

    await act(async () => {
      await result.current.fetchData(true);
    });

    expect(getAssetDomains).toHaveBeenCalledWith({
      assetIssuerDomainsToFetch: [
        "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      ],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    // @ts-ignore
    expect(result.current.state.data?.domains).toEqual([
      {
        code: "DT",
        issuer: testCanonicalIssuer,
        image: null,
        domain: "example.com",
        contract: undefined,
        isSuspicious: false,
      },
      {
        code: "USDC",
        issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        image: null,
        domain: "example2.com",
        contract: undefined,
        isSuspicious: true,
      },
    ]);
  });
  it("serves all domains using the API", async () => {
    const partialCachedState = {
      ...preloadedState,
      cache: {
        ...preloadedState.cache,
        homeDomains: {},
      },
    };

    const store = makeDummyStore(partialCachedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(
      () =>
        useGetAssetDomainsWithBalances({
          showHidden: false,
          includeIcons: false,
        }),
      { wrapper: Wrapper(store) },
    );

    (getAssetDomains as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        [testCanonicalIssuer]: "example.com",
        GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM:
          "example2.com",
      }),
    );

    await act(async () => {
      await result.current.fetchData(true);
    });

    expect(getAssetDomains).toHaveBeenCalledWith({
      assetIssuerDomainsToFetch: [
        testCanonicalIssuer,
        "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      ],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);

    // @ts-ignore
    expect(result.current.state.data?.domains).toEqual([
      {
        code: "DT",
        issuer: testCanonicalIssuer,
        image: null,
        domain: "example.com",
        contract: undefined,
        isSuspicious: false,
      },
      {
        code: "USDC",
        issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        image: null,
        domain: "example2.com",
        contract: undefined,
        isSuspicious: true,
      },
    ]);
  });
  it("serves all domains using the API - sets null for domains that are not found", async () => {
    const partialCachedState = {
      ...preloadedState,
      cache: {
        ...preloadedState.cache,
        homeDomains: {},
      },
    };

    const store = makeDummyStore(partialCachedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    const { result } = renderHook(
      () =>
        useGetAssetDomainsWithBalances({
          showHidden: false,
          includeIcons: false,
        }),
      { wrapper: Wrapper(store) },
    );

    await act(async () => {
      await result.current.fetchData(true);
    });

    expect(getAssetDomains).toHaveBeenCalledWith({
      assetIssuerDomainsToFetch: [
        testCanonicalIssuer,
        "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      ],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    // @ts-ignore
    expect(result.current.state.data?.domains).toEqual([
      {
        code: "DT",
        issuer: testCanonicalIssuer,
        image: null,
        domain: null,
        contract: undefined,
        isSuspicious: false,
      },
      {
        code: "USDC",
        issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        image: null,
        domain: "example2.com",
        contract: undefined,
        isSuspicious: true,
      },
    ]);
  });
});

describe("useGetAssetDomainsWithBalances (native-code asset identity)", () => {
  const publicKey = TEST_PUBLIC_KEY;

  // A classic asset that reuses the native display code "XLM" but is issued
  // by a real G-account. The display code alone doesn't make it native —
  // only the (code, issuer) pair does — so it must be treated as an
  // ordinary asset: its own issuer, its own domain lookup, its own
  // Blockaid verdict, and it must not collapse into the native row.
  const xlmCodeIssuer =
    "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
  const xlmCodeCanonical = `XLM:${xlmCodeIssuer}`;

  const balanceData = {
    isFunded: true,
    subentryCount: 1,
    error: undefined,
    balances: {
      native: {
        token: { type: "native", code: "XLM" },
        total: new BigNumber("50"),
        available: new BigNumber("50"),
        blockaidData: defaultBlockaidScanAssetResult,
      },
      [xlmCodeCanonical]: {
        token: {
          code: "XLM",
          issuer: { key: xlmCodeIssuer },
        },
        total: new BigNumber("100"),
        available: new BigNumber("100"),
        // Not benign, so a correct `isSuspicious` has to come from this data
        // — a hardcoded `false` would pin the wrong answer here.
        blockaidData: {
          address: `XLM-${xlmCodeIssuer}`,
          result_type: "Spam",
          features: [{ feature_id: "METADATA", description: "not benign" }],
        },
      },
    } as any,
  };

  const preloadedState = {
    auth: {
      publicKey,
      hasPrivateKey: true,
    },
    cache: {
      balanceData: {
        [TESTNET_NETWORK_DETAILS.network]: {
          [publicKey]: { ...balanceData, updatedAt: Date.now() },
        },
      },
      icons: {},
      tokenLists: [],
      homeDomains: {
        [TESTNET_NETWORK_DETAILS.network]: {
          [xlmCodeIssuer]: "notxlm.example.com",
        },
      },
    },
    settings: {
      assetsLists: [],
      networkDetails: TESTNET_NETWORK_DETAILS,
    },
    // The duck's default `assetSelect.type` is MANAGE, which skips the
    // native row entirely (the hook's `else if (!isManagingAssets)` branch),
    // so the native control row below would never be produced. Force a
    // non-manage context instead.
    transactionSubmission: {
      ...transactionSubmissionInitialState,
      assetSelect: { type: AssetSelectType.REGULAR, isSource: true },
    },
  };

  it("keeps a non-native XLM-coded asset out of the native row", async () => {
    const store = makeDummyStore(preloadedState);
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(
      () =>
        useGetAssetDomainsWithBalances({
          showHidden: false,
          includeIcons: false,
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.fetchData(true);
    });

    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);

    // @ts-ignore
    const domains = result.current.state.data?.domains as any[];

    // Both entries must exist as separate rows — the shared display code
    // must not merge one into the other.
    expect(domains).toHaveLength(2);

    const nativeRow = domains.find((d) => d.issuer === "");
    const xlmCodeRow = domains.find((d) => d.issuer === xlmCodeIssuer);

    // Control: the genuine native row is unchanged — no issuer, no domain
    // lookup, benign.
    expect(nativeRow).toEqual({
      code: "XLM",
      issuer: "",
      image: "",
      domain: "",
      isSuspicious: false,
    });

    // The non-native XLM-coded asset: real issuer, its own domain, and a
    // Blockaid-derived verdict rather than the hardcoded native default.
    expect(xlmCodeRow).toEqual({
      code: "XLM",
      issuer: xlmCodeIssuer,
      image: null,
      domain: "notxlm.example.com",
      contract: undefined,
      isSuspicious: true,
    });
  });
});
