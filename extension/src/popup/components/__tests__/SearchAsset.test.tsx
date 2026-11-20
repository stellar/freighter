import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";

import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import {
  getTestStore,
  mockAccounts,
  mockBalances,
  TEST_USDC_CANONICAL,
  Wrapper,
} from "popup/__testHelpers__";
import { saveBalancesForAccount } from "popup/ducks/cache";
import { ROUTES } from "popup/constants/routes";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
  NETWORKS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import * as UseSwapTokenLookup from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";
import { RequestState } from "constants/request";
import { SecurityLevel } from "popup/constants/blockaid";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  // The hidden-tokens sheet mounts useGetAssetDomainsWithBalances, whose
  // useIsSwap reads the location, so the mock has to answer with one.
  useLocation: jest.fn(() => ({
    pathname: "/manage-assets/search-asset",
    search: "",
    hash: "",
    state: null,
    key: "test",
  })),
}));

const aqua = {
  code: "AQUA",
  issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
  domain: "aquarius.world",
  canonical: "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
  isHeld: false,
  isContract: false,
  requiresTrustline: true,
  securityLevel: SecurityLevel.SAFE,
};
const lookupWith = (popular: unknown[], extra = {}) => ({
  fetchData: jest.fn().mockResolvedValue(undefined),
  state: {
    state: RequestState.SUCCESS,
    error: null,
    data: {
      sections: { yourTokens: [], popular, verified: [], unverified: [] },
      isSearch: false,
      isFallback: false,
      ...extra,
    },
  },
});
const renderSearchAsset = () =>
  render(
    <Wrapper
      routes={[ROUTES.searchAsset]}
      state={{
        auth: {
          error: null,
          applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
          publicKey: "G1",
          hasPrivateKey: true,
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
          assetsLists: { [NETWORKS.PUBLIC]: [] },
        },
      }}
    >
      <SearchAsset />
    </Wrapper>,
  );

describe("SearchAsset", () => {
  // The real lookup needs token-list settings the older tests don't seed.
  beforeEach(() => {
    jest
      .spyOn(UseSwapTokenLookup, "useSwapTokenLookup")
      .mockReturnValue(lookupWith([]) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockImplementation(() =>
        Promise.resolve({ hiddenAssets: {}, error: "" }),
      );
  });

  jest
    .spyOn(ApiInternal, "getAccountBalances")
    .mockImplementation(() => Promise.resolve(mockBalances));
  jest
    .spyOn(ApiInternal, "getHiddenAssets")
    .mockImplementation(() => Promise.resolve({ hiddenAssets: {}, error: "" }));

  it("opens the Hidden tokens sheet from Show hidden", async () => {
    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            hasPrivateKey: true,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("hidden-assets-btn")).toHaveTextContent(
        "Show hidden",
      );
    });

    fireEvent.click(screen.getByTestId("hidden-assets-btn"));

    await waitFor(() => {
      expect(screen.getByText("Hidden tokens")).toBeInTheDocument();
    });
    // The sheet owns its own data; its states are covered by its own tests.
    expect(await screen.findByTestId("HiddenAssets")).toBeInTheDocument();
  });

  it("refetches the hidden map when the balance cache changes", async () => {
    const getHidden = jest.spyOn(ApiInternal, "getHiddenAssets");
    getHidden.mockClear();

    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            hasPrivateKey: true,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("hidden-assets-btn")).toBeInTheDocument();
    });
    const callsBefore = getHidden.mock.calls.length;

    // A successful add writes new balances to the cache, as the add flows do
    getTestStore()!.dispatch(
      saveBalancesForAccount({
        publicKey: "G1",
        networkDetails: MAINNET_NETWORK_DETAILS,
        balances: mockBalances,
      } as any),
    );

    await waitFor(() => {
      expect(getHidden.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it("should render", async () => {
    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            hasPrivateKey: true,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose asset",
      );
    });
  });
  it("hides Show hidden once the user starts searching", async () => {
    // Typing kicks off the (debounced) asset lookup; keep it off the network
    // and let it fire before this test ends so no call leaks into the next
    // test's counts.
    const searchSpy = jest
      .spyOn(ApiInternal, "getStellarExpertAssets")
      .mockResolvedValue({ _embedded: { records: [] } });
    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            hasPrivateKey: true,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            assetsLists: {
              [NETWORKS.PUBLIC]: [],
            },
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("hidden-assets-btn")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("search-asset-input"), {
      target: { value: "USDC" },
    });

    await waitFor(() => {
      expect(screen.queryByTestId("hidden-assets-btn")).not.toBeInTheDocument();
    });
    await waitFor(() => expect(searchSpy).toHaveBeenCalled(), {
      timeout: 2000,
    });
    searchSpy.mockRestore();
  });

  it("should cancel the request when search is changed", async () => {
    const signalMock = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      aborted: false,
    };
    const abortMock = jest.fn();
    const mockAbortController = jest.fn(() => ({
      abort: abortMock,
      signal: signalMock,
    }));

    jest
      .spyOn(global, "AbortController")
      .mockImplementation(() => mockAbortController() as any);

    const searchSpy = jest
      .spyOn(ApiInternal, "getStellarExpertAssets")
      .mockImplementation(async ({ query }) => ({
        _embedded: {
          records: [
            {
              asset: `${query.search}-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM`,
            },
          ],
        },
      }));
    // Blockaid scans never settle, so only each lookup's own rows render.
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockImplementation(() => new Promise(() => {}));

    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            hasPrivateKey: true,
            allAccounts: mockAccounts,
            balances: mockBalances,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            assetsLists: {
              [NETWORKS.PUBLIC]: [],
            },
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose asset",
      );
    });

    fireEvent.change(screen.getByTestId("search-asset-input"), {
      target: { value: "USDC" },
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { search: "USDC" },
          signal: signalMock,
        }),
      );
    });
    expect(abortMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("search-asset-input"), {
      target: { value: "XLM" },
    });

    await waitFor(() => {
      // the 2nd request for XLM should cancel the 1st request for a Blockaid scan of USDC
      expect(abortMock).toHaveBeenCalledTimes(1);
      // one search per term, and one Blockaid scan per search
      expect(searchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // check that we only have results for our last search
      expect(screen.getByTestId("ManageAssetCode")).not.toHaveTextContent(
        "USDC",
      );
      expect(screen.getByTestId("ManageAssetCode")).toHaveTextContent("XLM");
    });
  });
  describe("Popular tokens", () => {
    it("lists Popular tokens before typing and runs the idle lookup with the account's balances", async () => {
      const lookup = lookupWith([aqua]);
      jest
        .spyOn(UseSwapTokenLookup, "useSwapTokenLookup")
        .mockReturnValue(lookup as any);
      renderSearchAsset();

      expect(
        await screen.findByTestId("search-asset-popular"),
      ).toHaveTextContent("Popular tokens");
      expect(
        screen.getByTestId("ManageAssetRow-AQUA-body"),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("asset-on-list")).toBeNull();
      await waitFor(() =>
        expect(lookup.fetchData).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: "",
            publicKey: expect.any(String),
            balances: expect.any(Array),
          }),
        ),
      );
    });

    it("hides Popular once the user types and restores it when cleared", async () => {
      const searchSpy = jest
        .spyOn(ApiInternal, "getStellarExpertAssets")
        .mockResolvedValue({ _embedded: { records: [] } });
      const lookup = lookupWith([aqua]);
      jest
        .spyOn(UseSwapTokenLookup, "useSwapTokenLookup")
        .mockReturnValue(lookup as any);
      renderSearchAsset();
      await screen.findByTestId("search-asset-popular");
      await waitFor(() => expect(lookup.fetchData).toHaveBeenCalled());
      const callsBefore = lookup.fetchData.mock.calls.length;

      fireEvent.change(screen.getByTestId("search-asset-input"), {
        target: { value: "USDC" },
      });
      await waitFor(() =>
        expect(screen.queryByTestId("search-asset-popular")).toBeNull(),
      );
      await waitFor(() => expect(searchSpy).toHaveBeenCalled(), {
        timeout: 2000,
      });

      fireEvent.change(screen.getByTestId("search-asset-input"), {
        target: { value: "" },
      });
      expect(
        await screen.findByTestId("search-asset-popular"),
      ).toBeInTheDocument();
      expect(lookup.fetchData.mock.calls.length).toBe(callsBefore);
    });

    it("shows the loader while Popular is cold-loading", async () => {
      jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
        fetchData: jest.fn().mockResolvedValue(undefined),
        state: { state: RequestState.LOADING, error: null, data: null },
      } as any);
      const { container } = renderSearchAsset();

      await waitFor(() =>
        expect(
          container.querySelector(".SearchResults__loader"),
        ).not.toBeNull(),
      );
    });

    it("shows nothing when discovery is down", async () => {
      jest
        .spyOn(UseSwapTokenLookup, "useSwapTokenLookup")
        .mockReturnValue(lookupWith([], { isFallback: true }) as any);
      const { container } = renderSearchAsset();

      await screen.findByTestId("hidden-assets-btn");
      expect(screen.queryByTestId("search-asset-popular")).toBeNull();
      expect(container.querySelector(".SearchResults__loader")).toBeNull();
      expect(screen.queryByText(/Unable to find your asset/)).toBeNull();
    });

    it("passes hidden held tokens to the lookup so Popular leaves them out", async () => {
      jest.spyOn(ApiInternal, "getHiddenAssets").mockResolvedValue({
        hiddenAssets: { [TEST_USDC_CANONICAL]: "hidden" },
        error: "",
      } as any);
      const lookup = lookupWith([aqua]);
      jest
        .spyOn(UseSwapTokenLookup, "useSwapTokenLookup")
        .mockReturnValue(lookup as any);
      renderSearchAsset();

      await waitFor(() => {
        const call = lookup.fetchData.mock.calls.find(
          ([arg]) => arg.searchTerm === "" && arg.balances.length,
        );
        expect(call).toBeDefined();
        expect(call![0].balances.map((b: any) => b.token?.code)).toContain(
          "USDC",
        );
      });
    });
  });
});
