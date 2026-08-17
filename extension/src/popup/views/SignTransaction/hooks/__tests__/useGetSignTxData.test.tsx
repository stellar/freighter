import React from "react";
import { Provider } from "react-redux";
import { useLocation } from "react-router-dom";
import { renderHook, act } from "@testing-library/react";
import {
  makeDummyStore,
  mockBalances,
  TEST_CANONICAL,
  TEST_PUBLIC_KEY,
} from "popup/__testHelpers__";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import * as AccountHelpers from "popup/helpers/account";
import * as BlockaidHelpers from "popup/helpers/blockaid";
import * as FetchHelpers from "popup/helpers/fetch";
import { getSiteSecurityStates } from "popup/helpers/blockaid";
import { ResolvedData, useGetSignTxData } from "../useGetSignTxData";
import * as GetAppDataHooks from "helpers/hooks/useGetAppData";
import * as GetBalancesHooks from "helpers/hooks/useGetBalances";
import { AppDataType } from "helpers/hooks/useGetAppData";
import * as TokenListHelpers from "@shared/api/helpers/token-list";
import * as GetIconUrlFromIssuerHelpers from "@shared/api/helpers/getIconUrlFromIssuer";
import * as GetIconFromTokenListHelpers from "@shared/api/helpers/getIconFromTokenList";

import { mockAccounts } from "../../../../__testHelpers__";
import { RequestState } from "helpers/hooks/useGetBalances";

const defaultSettingsState = {
  networkDetails: {
    isTestnet: false,
    network: "",
    networkName: "",
    otherNetworkName: "",
    networkUrl: "",
    networkPassphrase: "foo",
  },
};

jest.spyOn(GetAppDataHooks, "useGetAppData").mockReturnValue({
  fetchData: () =>
    Promise.resolve({
      type: AppDataType.RESOLVED,
      account: {
        publicKey: TEST_PUBLIC_KEY,
      },
      settings: defaultSettingsState,
    }),
} as any);
jest.spyOn(GetBalancesHooks, "useGetBalances").mockReturnValue({
  fetchData: () =>
    Promise.resolve({
      balances: mockBalances.balances,
      isFunded: true,
      subentryCount: 3,
    }),
} as any);
jest
  .spyOn(AccountHelpers, "signFlowAccountSelector")
  .mockReturnValue(mockAccounts[0]);

jest.spyOn(TokenListHelpers, "getCombinedAssetListData").mockResolvedValue([
  {
    name: "Test Asset List",
    description: "Test description",
    network: "testnet",
    version: "1.0.0",
    provider: "test",
    assets: [],
  },
]);

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(),
}));

describe("useGetSignTxData", () => {
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

  const tokenListData = [
    {
      name: "Example Asset List",
      description: "Example description",
      network: "testnet",
      version: "1.0.0",
      provider: "example",
      assets: [],
    },
  ];
  const canonicalKey = "XLM:GABCDEF";
  const cachedIcons = {
    [canonicalKey]: "https://cached/icon/url.png",
  };

  const testCanonicalIssuer = TEST_CANONICAL.split(":")[1];
  const preloadedState = {
    auth: {
      publicKey: TEST_PUBLIC_KEY,
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  const store = makeDummyStore(preloadedState);
  const Wrapper =
    (store: ReturnType<typeof makeDummyStore>) =>
    ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

  const changeTrustTx =
    "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAGQCjnUGAAABUQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAJSVUJUQwAAAAAAAAAAAAAAF7DK9H3uJ/qYfQakv93qidEVa/Hh7mAXrDl2fbEgVQh//////////wAAAAAAAAAA";
  const setOptionsTx =
    "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAGQCjnUGAAABUQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  it("serves sign tx data and fetches asset lists", async () => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockReturnValue({
      scanTx: () =>
        Promise.resolve({
          simulation: {
            status: "Success",
            assets_diffs: {
              [TEST_PUBLIC_KEY]: [
                {
                  asset: {
                    code: "TEST",
                    issuer: TEST_CANONICAL,
                  },
                },
              ],
            },
          },
          validation: null,
          request_id: "1",
        }),
    } as any);

    jest
      .spyOn(GetIconUrlFromIssuerHelpers, "getIconUrlFromIssuer")
      .mockResolvedValue("");

    jest
      .spyOn(GetIconFromTokenListHelpers, "getIconFromTokenLists")
      .mockResolvedValue({
        icon: "https://example.com/icon.png",
        canonicalAsset: TEST_CANONICAL,
      });

    const { result } = renderHook(
      () =>
        useGetSignTxData(
          {
            xdr: changeTrustTx,
            url: "https://example.com",
          },
          {
            showHidden: false,
            includeIcons: false,
          },
          "G123",
        ),
      { wrapper: Wrapper(store) },
    );

    await act(async () => {
      await result.current.fetchData();
    });

    // Verify that asset lists data was used (icons populated indicates asset lists data length > 0)
    // @ts-ignore
    expect(result.current.state.data?.icons).toEqual({
      [TEST_CANONICAL]: "https://example.com/icon.png",
    });
    // @ts-ignore
    expect(result.current.state.data?.balances).toEqual({
      balances: mockBalances.balances,
      isFunded: true,
      subentryCount: 3,
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });

  it("serves sign tx data and skips fetching asset lists if simulation is null", async () => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockReturnValue({
      scanTx: () =>
        Promise.resolve({
          simulation: null,
          validation: null,
          request_id: "1",
        }),
    } as any);
    const { result } = renderHook(
      () =>
        useGetSignTxData(
          {
            xdr: setOptionsTx,
            url: "https://example.com",
          },
          {
            showHidden: false,
            includeIcons: false,
          },
          "G123",
        ),
      { wrapper: Wrapper(store) },
    );

    await act(async () => {
      await result.current.fetchData();
    });

    // Verify that asset lists data was not used (no icons indicates asset lists data length = 0 or not fetched)
    // @ts-ignore
    expect(result.current.state.data?.icons).toEqual({});
    // @ts-ignore
    expect(result.current.state.data?.balances).toEqual({
      balances: mockBalances.balances,
      isFunded: true,
      subentryCount: 3,
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });
  it("serves sign tx data and skips fetching asset lists if simulation is null but fetches for changeTrust operations", async () => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockReturnValue({
      scanTx: () =>
        Promise.resolve({
          simulation: null,
          validation: null,
          request_id: "1",
        }),
    } as any);
    const { result } = renderHook(
      () =>
        useGetSignTxData(
          {
            xdr: changeTrustTx,
            url: "https://example.com",
          },
          {
            showHidden: false,
            includeIcons: false,
          },
          "G123",
        ),
      { wrapper: Wrapper(store) },
    );

    jest
      .spyOn(GetIconUrlFromIssuerHelpers, "getIconUrlFromIssuer")
      .mockResolvedValue("");

    jest
      .spyOn(GetIconFromTokenListHelpers, "getIconFromTokenLists")
      .mockResolvedValue({
        icon: "https://example.com/icon.png",
        canonicalAsset: TEST_CANONICAL,
      });

    await act(async () => {
      await result.current.fetchData();
    });

    // Verify that asset lists data was used (icons populated indicates asset lists data length > 0)
    // @ts-ignore
    expect(result.current.state.data?.icons).toEqual({
      [TEST_CANONICAL]: "https://example.com/icon.png",
    });
    // @ts-ignore
    expect(result.current.state.data?.balances).toEqual({
      balances: mockBalances.balances,
      isFunded: true,
      subentryCount: 3,
    });
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });

  it("handles balance fetch failure gracefully and returns success with undefined balances", async () => {
    jest.spyOn(GetBalancesHooks, "useGetBalances").mockReturnValue({
      fetchData: () => Promise.reject(new Error("Failed to fetch balances")),
      state: {
        state: RequestState.IDLE,
        data: null,
        error: null,
      },
    } as ReturnType<typeof GetBalancesHooks.useGetBalances>);

    jest.spyOn(BlockaidHelpers, "useScanTx").mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
      setLoading: jest.fn(),
      scanTx: () =>
        Promise.resolve({
          simulation: null,
          validation: null,
          request_id: "1",
        }),
    } as ReturnType<typeof BlockaidHelpers.useScanTx>);

    const { result } = renderHook(
      () =>
        useGetSignTxData(
          {
            xdr: setOptionsTx,
            url: "https://example.com",
          },
          {
            showHidden: false,
            includeIcons: false,
          },
          "G123",
        ),
      { wrapper: Wrapper(store) },
    );

    await act(async () => {
      await result.current.fetchData();
    });

    // Should still succeed but with null balances
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(
      (result.current.state.data as { balances: unknown })?.balances,
    ).toBeNull();
    expect((result.current.state.data as { type: string })?.type).toBe(
      AppDataType.RESOLVED,
    );
  });
});

/**
 * The site scan is kicked off unawaited (useGetSignTxData `scanSite(...)`) while
 * `fetchData` keeps awaiting the changeTrust icon lookup. Both writers land in
 * the same reducer slot, and `helpers/request.ts` full-replaces `data`, so
 * whichever dispatch runs last owns the whole payload. These two tests pin both
 * resolution orderings: neither writer may drop the other's field.
 */
describe("useGetSignTxData site scan / icon fetch interleaving", () => {
  // A changeTrust op for RUBTC whose issuer is absent from the store icon cache
  // below, so the awaited getIconUrlFromIssuer path is forced.
  const changeTrustTx =
    "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAGQCjnUGAAABUQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAJSVUJUQwAAAAAAAAAAAAAAF7DK9H3uJ/qYfQakv93qidEVa/Hh7mAXrDl2fbEgVQh//////////wAAAAAAAAAA";
  const DOMAIN = "https://malicious.example.com";
  const ICON_URL = "https://icon.example/icon.png";
  const MALICIOUS_SITE = { status: "hit", is_malicious: true };

  /** A promise the test resolves by hand, to control resolution order. */
  const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  };

  // Drains microtasks plus one macrotask turn, so the unawaited scan chain has
  // run as far as its next unresolved await.
  const flush = () => new Promise((r) => setTimeout(r, 0));

  const preloadedState = {
    auth: { publicKey: TEST_PUBLIC_KEY },
    cache: {
      balanceData: {},
      icons: {},
      tokenLists: [],
      homeDomains: {},
    },
    settings: {
      assetsLists: [],
      networkDetails: MAINNET_NETWORK_DETAILS,
    },
  };

  const Wrapper =
    (store: ReturnType<typeof makeDummyStore>) =>
    ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

  const renderSignTxData = () =>
    renderHook(
      () =>
        useGetSignTxData(
          { xdr: changeTrustTx, url: DOMAIN },
          { showHidden: false, includeIcons: false },
          "G123",
          DOMAIN,
        ),
      { wrapper: Wrapper(makeDummyStore(preloadedState)) },
    );

  const resolvedData = (result: { current: { state: { data: unknown } } }) =>
    result.current.state.data as ResolvedData;

  beforeEach(() => {
    // Mainnet, so isBlockaidEnabled passes and the real site scan runs.
    jest.spyOn(GetAppDataHooks, "useGetAppData").mockReturnValue({
      fetchData: () =>
        Promise.resolve({
          type: AppDataType.RESOLVED,
          account: {
            publicKey: TEST_PUBLIC_KEY,
            allAccounts: mockAccounts,
          },
          settings: { networkDetails: MAINNET_NETWORK_DETAILS },
        }),
    } as any);
    // Benign transaction scan, so the site scan is the only security signal.
    jest.spyOn(BlockaidHelpers, "useScanTx").mockReturnValue({
      scanTx: () =>
        Promise.resolve({
          simulation: null,
          validation: null,
          request_id: "1",
        }),
    } as any);
  });

  /**
   * Sets up the two racing network leaves. `useAsyncSiteScan`, `useScanSite`,
   * the updatePayload closure, the reducer and getSiteSecurityStates all stay
   * real — only the fetches at the edges are stubbed.
   */
  const stubRacingFetches = () => {
    const siteScan = deferred<{ data: unknown; error: null }>();
    const icon = deferred<string>();

    jest
      .spyOn(FetchHelpers, "fetchJson")
      .mockImplementation((url: string) =>
        url.includes("/scan-dapp")
          ? (siteScan.promise as any)
          : Promise.reject(new Error(`unexpected fetchJson: ${url}`)),
      );
    jest
      .spyOn(GetIconUrlFromIssuerHelpers, "getIconUrlFromIssuer")
      .mockReturnValue(icon.promise as any);

    return { siteScan, icon };
  };

  it("keeps a malicious site verdict when the scan resolves before the changeTrust icon fetch", async () => {
    const { siteScan, icon } = stubRacingFetches();
    const { result } = renderSignTxData();

    // Advance until fetchData is suspended on the icon fetch.
    let fetchDataPromise: Promise<unknown>;
    await act(async () => {
      fetchDataPromise = result.current.fetchData();
      await flush();
    });
    expect(resolvedData(result).siteScanData).toBeUndefined();

    // The scan lands first with the malicious verdict.
    await act(async () => {
      siteScan.resolve({ data: MALICIOUS_SITE, error: null });
      await flush();
    });
    expect(resolvedData(result).siteScanData).toEqual(MALICIOUS_SITE);

    // The slow icon fetch lands last and fetchData dispatches its final payload.
    await act(async () => {
      icon.resolve(ICON_URL);
      await flush();
      await fetchDataPromise;
    });

    const siteScanData = resolvedData(result).siteScanData;
    expect(siteScanData).toEqual(MALICIOUS_SITE);

    // The exact gate SignTransaction/index.tsx uses to raise the banner and mark
    // Confirm destructive.
    const states = getSiteSecurityStates(
      siteScanData,
      null,
      MAINNET_NETWORK_DETAILS,
    );
    expect(states.isMalicious).toBe(true);
  });

  it("keeps the fetched changeTrust icons when the scan resolves after the icon fetch", async () => {
    const { siteScan, icon } = stubRacingFetches();
    const { result } = renderSignTxData();

    let fetchDataPromise: Promise<unknown>;
    await act(async () => {
      fetchDataPromise = result.current.fetchData();
      await flush();
    });

    // Reversed ordering: the icon fetch lands first, so fetchData runs to
    // completion and dispatches the icons...
    await act(async () => {
      icon.resolve(ICON_URL);
      await flush();
      await fetchDataPromise;
    });
    expect(Object.values(resolvedData(result).icons)).toEqual([ICON_URL]);

    // ...then the scan dispatch lands last and must not drop them.
    await act(async () => {
      siteScan.resolve({ data: MALICIOUS_SITE, error: null });
      await flush();
    });

    expect(Object.values(resolvedData(result).icons)).toEqual([ICON_URL]);
    expect(resolvedData(result).siteScanData).toEqual(MALICIOUS_SITE);
  });
});
