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
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as AccountHelpers from "popup/helpers/account";
import * as BlockaidHelpers from "popup/helpers/blockaid";
import { useGetSignTxData } from "../useGetSignTxData";
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
