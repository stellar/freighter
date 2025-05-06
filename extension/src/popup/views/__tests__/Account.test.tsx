import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { Horizon } from "stellar-sdk";
import BigNumber from "bignumber.js";
import * as ReactRouterDom from "react-router-dom";

import {
  APPLICATION_STATE,
  APPLICATION_STATE as ApplicationState,
} from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { Balances } from "@shared/api/types/backend-api";
import * as ApiInternal from "@shared/api/internal";
import * as ExtensionMessaging from "@shared/api/helpers/extensionMessaging";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import * as UseAssetDomain from "popup/helpers/useAssetDomain";
import { INDEXER_URL } from "@shared/constants/mercury";
import { SERVICE_TYPES } from "@shared/constants/services";
import { Response, SettingsState } from "@shared/api/types";
import { accountNameSelector } from "popup/ducks/accountServices";
import * as TokenListHelpers from "@shared/api/helpers/token-list";
import * as RouteHelpers from "popup/helpers/route";

import {
  Wrapper,
  mockBalances,
  mockAccounts,
  mockTestnetBalances,
  mockPrices,
  TEST_CANONICAL,
  TEST_PUBLIC_KEY,
  mockSelector,
} from "../../__testHelpers__";
import { Account } from "../Account";
import { ROUTES } from "popup/constants/routes";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";
import { AppDataType } from "helpers/hooks/useGetAppData";
import * as AccountDataHooks from "../../views/Account/hooks/useGetAccountData";
import { RequestState } from "helpers/hooks/fetchHookInterface";

const mockHistoryOperations = {
  operations: [
    {
      amount: "1",
      type: "payment",
      asset_type: "native",
      asset_issuer: "issuer",
      asset_code: "code",
      from: "G1",
      to: "G2",
    },
  ] as Horizon.ServerApi.PaymentOperationRecord[],
};

jest
  .spyOn(global, "fetch")
  .mockImplementation(
    (url: string | URL | Request, _init?: RequestInit | undefined) => {
      if (
        url ===
        `${INDEXER_URL}/scan-asset-bulk?asset_ids=USDC-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM`
      ) {
        return Promise.resolve({
          json: async () => {
            return {
              data: {
                results: {
                  "USDC-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM":
                    {
                      address: "",
                      chain: "stellar",
                      attack_types: {},
                      fees: {},
                      malicious_score: "1.0",
                      metadata: {},
                      financial_stats: {},
                      trading_limits: {},
                      result_type: "Malicious",
                      features: [
                        {
                          description: "",
                          feature_id: "METADATA",
                          type: "Benign",
                        },
                      ],
                    },
                },
              },
            };
          },
        } as any);
      }

      return Promise.resolve({
        json: async () => {
          return [];
        },
      } as any);
    },
  );

jest
  .spyOn(ApiInternal, "getHiddenAssets")
  .mockImplementation(() => Promise.resolve({ hiddenAssets: {}, error: "" }));

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(mockBalances));

jest
  .spyOn(ApiInternal, "getTokenPrices")
  .mockImplementation(() => Promise.resolve(mockPrices));

jest
  .spyOn(ExtensionMessaging, "sendMessageToBackground")
  .mockImplementation((msg) => {
    if (msg.type === SERVICE_TYPES.GET_TOKEN_IDS) {
      return Promise.resolve({ tokenIdList: [] as string[] } as Response);
    }

    return Promise.resolve({} as Response);
  });

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Asset: original.Asset,
    StrKey: original.StrKey,
    Networks: original.Networks,
    Operation: original.Operation,
    Horizon: {
      Server: class {
        accounts() {
          return {
            accountId: () => ({
              call: () =>
                Promise.resolve({
                  balances: [
                    {
                      asset_code: "USDC",
                      asset_issuer:
                        "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
                      asset_type: "credit_alphanum4",
                      balance: "100.0000000",
                      buying_liabilities: "0.0000000",
                      selling_liabilities: "0.0000000",
                      limit: "1000.0000000",
                    },
                    {
                      asset_type: "native",
                      balance: "50.0000000",
                      buying_liabilities: "0.0000000",
                      selling_liabilities: "0.0000000",
                    },
                  ],
                }),
            }),
          };
        }
      },
      HorizonApi: original.Horizon.HorizonApi,
    },
    SorobanRpc: original.SorobanRpc,
    TransactionBuilder: original.TransactionBuilder,
  };
});

jest
  .spyOn(ApiInternal, "getTokenIds")
  .mockImplementation(() => Promise.resolve(["C1"]));

jest
  .spyOn(ApiInternal, "getAccountHistory")
  .mockImplementation(() => Promise.resolve(mockHistoryOperations.operations));

jest.spyOn(UseAssetDomain, "useAssetDomain").mockImplementation(() => {
  return { assetDomain: "centre.io", error: "" };
});

jest.spyOn(ApiInternal, "getAssetIcons").mockImplementation(() =>
  Promise.resolve({
    "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM":
      "http://domain.com/icon.png",
  }),
);

jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
  Promise.resolve({
    hasPrivateKey: true,
    publicKey: TEST_PUBLIC_KEY,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: mockAccounts,
    bipPath: "bip-path",
    tokenIdList: [],
  }),
);

jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
  Promise.resolve({
    networkDetails: TESTNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    hiddenAssets: {},
    allowList: ApiInternal.DEFAULT_ALLOW_LIST,
    error: "",
    isDataSharingAllowed: false,
    isMemoValidationEnabled: false,
    isHideDustEnabled: true,
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
  }),
);

jest
  .spyOn(TokenListHelpers, "getCombinedAssetListData")
  .mockImplementation(() => Promise.resolve([]));

jest.mock("helpers/metrics", () => ({
  storeAccountMetricsData: jest.fn(),
  registerHandler: jest.fn(),
  storeBalanceMetricData: jest.fn(),
  emitMetric: jest.fn(),
  metricsMiddleware: jest.fn(),
}));

jest.mock("popup/ducks/accountServices", () => {
  const actual = jest.requireActual("popup/ducks/accountServices");
  return {
    ...actual,
    accountNameSelector: jest.fn(),
    allAccountsSelector: actual.allAccountsSelector,
  };
});

describe("Account view", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
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
            hiddenAssets: {},
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("account-view"));
    expect(screen.getByTestId("account-view")).toBeDefined();
  });

  it("loads accounts", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("account-header"));
    expect(screen.getByTestId("account-header")).toBeDefined();
    const accountNodes = screen.getAllByTestId("account-list-item");
    expect(accountNodes.length).toEqual(3);
    expect(screen.getAllByText("Account 1")).toBeDefined();
  });

  it("displays balances and scam notifications on Mainnet", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => {
      const assetNodes = screen.getAllByTestId("account-assets-item");
      expect(assetNodes.length).toEqual(3);
      expect(
        screen.getByTestId("AccountAssets__asset--loading-XLM"),
      ).not.toContainElement(screen.getByTestId("ScamAssetIcon"));
      expect(
        screen.getByTestId("AccountAssets__asset--loading-USDC"),
      ).toContainElement(screen.getByTestId("ScamAssetIcon"));
      expect(screen.getAllByText("USDC")).toBeDefined();
    });
  });

  it("displays balances and scam notifications on custom Mainnet network", async () => {
    const customMainnet = {
      network: "STANDALONE",
      networkName: "Custom Network",
      networkPassphrase: MAINNET_NETWORK_DETAILS.networkPassphrase,
      networkUrl: MAINNET_NETWORK_DETAILS.networkUrl,
    };

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: customMainnet,
            networksList: [...DEFAULT_NETWORKS, customMainnet],
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => {
      const assetNodes = screen.getAllByTestId("account-assets-item");
      expect(assetNodes.length).toEqual(3);
      expect(
        screen.getByTestId("AccountAssets__asset--loading-XLM"),
      ).not.toContainElement(screen.getByTestId("ScamAssetIcon"));
      expect(
        screen.getByTestId("AccountAssets__asset--loading-USDC"),
      ).toContainElement(screen.getByTestId("ScamAssetIcon"));
      expect(screen.getAllByText("USDC")).toBeDefined();
    });
  });

  it("displays balances on custom TESTNET network without scam icons", async () => {
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockTestnetBalances));

    const customMainnet = {
      network: "STANDALONE",
      networkName: "Custom Network",
      networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
      networkUrl: TESTNET_NETWORK_DETAILS.networkUrl,
    };

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: customMainnet,
            networksList: [...DEFAULT_NETWORKS, customMainnet],
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => {
      const assetNodes = screen.getAllByTestId("account-assets-item");
      expect(assetNodes.length).toEqual(3);
      expect(
        screen.getByTestId("AccountAssets__asset--loading-XLM"),
      ).toBeDefined();
      expect(
        screen.getByTestId("AccountAssets__asset--loading-USDC"),
      ).toBeDefined();
      expect(screen.getAllByText("USDC")).toBeDefined();
      expect(screen.queryByTestId("ScamAssetIcon")).toBeNull();
    });
  });

  it("goes to account details", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(async () => {
      await fireEvent.click(
        screen.getByTestId("AccountAssets__asset--loading-USDC"),
      );
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("asset-detail-available-copy"),
      ).toHaveTextContent("100 USDC");
    });
  });

  it("shows Blockaid warning in account details", async () => {
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(async () => {
      await fireEvent.click(
        screen.getByTestId("AccountAssets__asset--loading-USDC"),
      );
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("asset-detail-available-copy"),
      ).toHaveTextContent("100 USDC");
    });
    await waitFor(() => {
      expect(screen.getByTestId("ScamAssetWarning__box")).toBeDefined();
    });
  });

  it("switches accounts", async () => {
    mockSelector(accountNameSelector, () => "Account 1");

    jest
      .spyOn(ApiInternal, "makeAccountActive")
      .mockImplementation(() =>
        Promise.resolve({ publicKey: "G2", hasPrivateKey: true, bipPath: "" }),
      );
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );
    await waitFor(async () => {
      const accountIdenticonNodes = screen.getAllByTestId(
        "account-list-identicon-button",
      );
      mockSelector(accountNameSelector, () => "Account 2");
      await fireEvent.click(accountIdenticonNodes[2]);
    });

    await waitFor(async () => {
      expect(screen.getByTestId("account-view-account-name")).toHaveTextContent(
        "Account 2",
      );
    });
  });

  it("loads LP shares", async () => {
    const mockLpBalance = {
      balances: {
        ["2f0d463c05c1f99676a90f78f32f4bf6ddf7f5227dce805711c65e257434f9dd:lp"]:
          {
            total: new BigNumber("1000000000"),
            limit: new BigNumber("1000000000"),
            liquidityPoolId:
              "2f0d463c05c1f99676a90f78f32f4bf6ddf7f5227dce805711c65e257434f9dd",
            available: new BigNumber("1000000000"),
            reserves: [
              { asset: "A:foo", amount: "0.000" },
              { asset: "B:bar", amount: "0.000" },
            ],
            blockaidData: defaultBlockaidScanAssetResult,
          },
        native: {
          token: { type: "native", code: "XLM" },
          total: new BigNumber("50"),
          available: new BigNumber("50"),
          blockaidData: defaultBlockaidScanAssetResult,
        },
      } as any as Balances,
      isFunded: true,
      subentryCount: 1,
    };
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockLpBalance));

    jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
      Promise.resolve({
        hasPrivateKey: true,
        publicKey: TEST_PUBLIC_KEY,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        allAccounts: mockAccounts,
        bipPath: "bip-path",
        tokenIdList: [],
      }),
    );

    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: TESTNET_NETWORK_DETAILS,
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: ApiInternal.DEFAULT_ALLOW_LIST,
        error: "",
        isDataSharingAllowed: false,
        isMemoValidationEnabled: false,
        isHideDustEnabled: true,
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
      }),
    );

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );
    await waitFor(() => {
      const assetNodes = screen.getAllByTestId("account-assets-item");
      expect(assetNodes.length).toEqual(2);
      expect(assetNodes[1]).toHaveTextContent("LP");
      expect(assetNodes[1]).toHaveTextContent("0");
    });
  });

  it("shows prices and deltas", async () => {
    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: MAINNET_NETWORK_DETAILS,
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: ApiInternal.DEFAULT_ALLOW_LIST,
        error: "",
        isDataSharingAllowed: false,
        isMemoValidationEnabled: false,
        isHideDustEnabled: true,
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
      }),
    );
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));

    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementation(() => Promise.resolve(mockPrices));

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(async () => {
      const assetNodes = screen.getAllByTestId("account-assets-item");
      expect(assetNodes.length).toEqual(3);
      expect(
        screen.getByTestId(`asset-amount-${TEST_CANONICAL}`),
      ).toHaveTextContent("$834,463.68");
      expect(
        screen.getByTestId(`asset-price-delta-${TEST_CANONICAL}`),
      ).toHaveTextContent("3.98%");
      expect(screen.getByTestId(`asset-amount-native`)).toHaveTextContent(
        "$13.82",
      );
      expect(screen.getByTestId(`asset-price-delta-native`)).toHaveTextContent(
        "1.10%",
      );
    });
  });

  it("handles abandoned onboarding in password created step", async () => {
    jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
      Promise.resolve({
        hasPrivateKey: true,
        publicKey: TEST_PUBLIC_KEY,
        applicationState: APPLICATION_STATE.PASSWORD_CREATED,
        allAccounts: mockAccounts,
        bipPath: "bip-path",
        tokenIdList: [],
      }),
    );

    const mockReRoute = jest
      .spyOn(RouteHelpers, "reRouteOnboarding")
      .mockImplementation(jest.fn());
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "",
            allAccounts: [],
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockReRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppDataType.RESOLVED,
          applicationState: ApplicationState.PASSWORD_CREATED,
        }),
      );
    });
  });

  it("handles abandoned onboarding in failed mnemonic phrase step", async () => {
    jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
      Promise.resolve({
        hasPrivateKey: true,
        publicKey: TEST_PUBLIC_KEY,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_FAILED,
        allAccounts: mockAccounts,
        bipPath: "bip-path",
        tokenIdList: [],
      }),
    );

    const mockReRoute = jest
      .spyOn(RouteHelpers, "reRouteOnboarding")
      .mockImplementation(jest.fn());
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_FAILED,
            publicKey: "",
            allAccounts: [],
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockReRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppDataType.RESOLVED,
          applicationState: ApplicationState.MNEMONIC_PHRASE_FAILED,
        }),
      );
    });
  });

  it("handles abandoned onboarding in application started phrase step", async () => {
    jest.spyOn(AccountDataHooks, "useGetAccountData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.REROUTE,
          shouldOpenTab: false,
          routeTarget: ROUTES.welcome,
        },
        error: null,
      },
      fetchData: jest.fn(),
    });

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.APPLICATION_STARTED,
            publicKey: "",
            allAccounts: [],
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <ReactRouterDom.Routes>
          <ReactRouterDom.Route path={ROUTES.account} element={<Account />} />
          <ReactRouterDom.Route
            path={ROUTES.welcome}
            element={<div data-testid="rerouted" />}
          />
        </ReactRouterDom.Routes>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("rerouted")).toBeInTheDocument();
    });
  });
});
