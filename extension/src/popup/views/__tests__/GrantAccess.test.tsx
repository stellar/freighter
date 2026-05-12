import React from "react";
import { render, waitFor, screen } from "@testing-library/react";

import {
  APPLICATION_STATE,
  APPLICATION_STATE as ApplicationState,
} from "@shared/constants/applicationState";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { GrantAccess } from "../GrantAccess";
import * as blockAidHelpers from "popup/helpers/blockaid";
import { BlockAidScanSiteResult, SettingsState } from "@shared/api/types";
import * as urlHelpers from "../../../helpers/urls";
import { ROUTES } from "popup/constants/routes";
import * as ApiInternal from "@shared/api/internal";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";

const mockLoadAccount = () =>
  Promise.resolve({
    hasPrivateKey: true,
    publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: mockAccounts,
    bipPath: "bip-path",
    tokenIdList: [],
  });

const mockLoadSettings = () =>
  Promise.resolve({
    networkDetails: TESTNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    hiddenAssets: {},
    allowList: ApiInternal.DEFAULT_ALLOW_LIST,
    error: "",
    isDataSharingAllowed: false,
    isMemoValidationEnabled: false,
    isHideDustEnabled: true,
    isOpenSidebarByDefault: false,
    settingsState: SettingsState.SUCCESS,
    isSorobanPublicEnabled: false,
    isRpcHealthy: true,
    userNotification: {
      enabled: false,
      message: "",
    },
    isExperimentalModeEnabled: false,
    isHashSigningEnabled: false,
    isNonSSLEnabled: false,
    experimentalFeaturesState: SettingsState.SUCCESS,
    assetsLists: DEFAULT_ASSETS_LISTS,
  });

describe("Grant Access view", () => {
  beforeEach(() => {
    jest.spyOn(urlHelpers, "parsedSearchParam").mockImplementation(() => {
      const original = jest.requireActual("../../../helpers/urls");
      return { ...original, url: "example.com" };
    });
    jest.spyOn(ApiInternal, "loadAccount").mockImplementation(mockLoadAccount);
    jest
      .spyOn(ApiInternal, "loadSettings")
      .mockImplementation(mockLoadSettings);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    jest.spyOn(blockAidHelpers, "useScanSite").mockImplementation(() => {
      return {
        error: null,
        isLoading: false,
        data: {
          is_malicious: false,
        } as BlockAidScanSiteResult,
        scanSite: (_url: string) => {
          return Promise.resolve({
            is_malicious: false,
          } as BlockAidScanSiteResult);
        },
      };
    });
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
  });

  // not applicable right now, but we may show this warning in the future
  it.skip("shows a benign label when scan site returns non malicious flag", async () => {
    jest.spyOn(blockAidHelpers, "useScanSite").mockImplementation(() => {
      return {
        error: null,
        isLoading: false,
        data: {
          is_malicious: false,
        } as BlockAidScanSiteResult,
        scanSite: (_url: string) => {
          return Promise.resolve({
            is_malicious: false,
          } as BlockAidScanSiteResult);
        },
      };
    });

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    expect(screen.getByTestId("blockaid-benign-label")).toBeDefined();
  });

  it("shows a miss label when scan site returns a miss status", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ data: { status: "miss" }, error: null }),
      } as any),
    );

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    await waitFor(() =>
      expect(screen.getByTestId("blockaid-miss-label")).toBeDefined(),
    );
  });

  it("shows a malicious label when scan site returns a malicious flag", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({
          data: { status: "hit", is_malicious: true },
          error: null,
        }),
      } as any),
    );

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    await waitFor(() =>
      expect(screen.getByTestId("blockaid-malicious-label")).toBeDefined(),
    );
  });

  it("shows unable to scan label when scan site returns an error on Mainnet", async () => {
    jest
      .spyOn(global, "fetch")
      .mockImplementation(() =>
        Promise.reject(new Error("Failed to scan site")),
      );

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    await waitFor(() =>
      expect(screen.getByTestId("blockaid-unable-to-scan-label")).toBeDefined(),
    );
    expect(
      screen.getByTestId("grant-access-connect-anyway-button"),
    ).toBeDefined();
  });
  it("suppresses Blockaid site warnings on custom networks (Mainnet-only feature)", async () => {
    // Stub `fetch` to a benign success so that, if the network gate ever
    // regresses and a `/scan-dapp` (or any other) call leaks through, the
    // test doesn't attempt a real network request and become flaky in CI.
    // The assertion below still verifies no `/scan-dapp` call was made.
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({}),
    } as Response);
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: {
              network: CUSTOM_NETWORK,
              networkName: "Custom Network",
              networkUrl: "https://custom-network.com",
              networkPassphrase: "CUSTOM_NETWORK",
            },
            networksList: [
              ...DEFAULT_NETWORKS,
              {
                network: CUSTOM_NETWORK,
                networkName: "Custom Network",
                networkUrl: "https://custom-network.com",
                networkPassphrase: "CUSTOM_NETWORK",
              },
            ],
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    // No Blockaid label should be rendered, and the dapp scan endpoint should
    // never be called on a non-Mainnet network.
    expect(screen.queryByTestId("blockaid-unable-to-scan-label")).toBeNull();
    expect(screen.queryByTestId("blockaid-malicious-label")).toBeNull();
    expect(screen.queryByTestId("blockaid-miss-label")).toBeNull();
    expect(
      fetchSpy.mock.calls.some(
        ([url]) => typeof url === "string" && url.includes("/scan-dapp"),
      ),
    ).toBe(false);
  });
  it("shows unable to scan label when scan site API returns an error", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({}),
      } as any),
    );

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: [DEFAULT_NETWORKS],
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    await waitFor(() =>
      expect(screen.getByTestId("blockaid-unable-to-scan-label")).toBeDefined(),
    );
    expect(
      screen.getByTestId("grant-access-connect-anyway-button"),
    ).toBeDefined();
  });
});
