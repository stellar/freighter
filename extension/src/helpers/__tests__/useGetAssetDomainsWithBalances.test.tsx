import React from "react";
import { Provider } from "react-redux";
import { useLocation } from "react-router-dom";
import { renderHook, act } from "@testing-library/react";
import { useGetAssetDomainsWithBalances } from "../hooks/useGetAssetDomainsWithBalances";
import {
  makeDummyStore,
  mockBalances,
  TEST_CANONICAL,
  TEST_PUBLIC_KEY,
} from "popup/__testHelpers__";
import { RequestState } from "constants/request";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getAssetDomain } from "popup/helpers/getAssetDomain";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getAccountBalances: jest.fn(),
  getAssetIcons: jest.fn().mockResolvedValue({}),
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
  ...jest.requireActual("popup/helpers/account"),
  filterHiddenBalances: (_b: any) => _b,
}));
jest.mock("popup/helpers/getAssetDomain", () => ({
  ...jest.requireActual("popup/helpers/getAssetDomain"),
  getAssetDomain: jest.fn(),
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

  const store = makeDummyStore(preloadedState);
  const Wrapper =
    (store: ReturnType<typeof makeDummyStore>) =>
    ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

  it("serves domains from the cache and skips the API call", async () => {
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

    expect(getAssetDomain).not.toHaveBeenCalled();
    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
  });
});
