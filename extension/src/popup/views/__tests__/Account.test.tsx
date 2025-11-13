import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
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
import { HorizonOperation, Response, SettingsState } from "@shared/api/types";
import * as TokenListHelpers from "@shared/api/helpers/token-list";
import * as GetIconFromTokenList from "@shared/api/helpers/getIconFromTokenList";
import * as GetIconUrlFromIssuer from "@shared/api/helpers/getIconUrlFromIssuer";
import * as RouteHelpers from "popup/helpers/route";

import {
  Wrapper,
  mockBalances,
  mockAccounts,
  mockTestnetBalances,
  mockPrices,
  TEST_CANONICAL,
  TEST_PUBLIC_KEY,
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
      transaction_attr: { operation_count: 1, fee_charged: "" },
    },
    {
      id: "123",
      amount: "100",
      type: "payment",
      asset_type: "credit_alphanum4",
      asset_issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      asset_code: "USDC",
      from: "G1",
      to: "G2",
      transaction_attr: { operation_count: 1, fee_charged: "" },
      created_at: "2025-10-07T12:31:45Z",
    },
  ] as HorizonOperation[],
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
    rpc: original.rpc,
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

jest.spyOn(ApiInternal, "loadBackendSettings").mockImplementation(() =>
  Promise.resolve({
    isSorobanPublicEnabled: true,
    isRpcHealthy: true,
    userNotification: {
      enabled: false,
      message: "",
    },
  }),
);

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
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  jest
    .spyOn(ApiInternal, "getAccountBalances")
    .mockImplementation(({ isScanSkipped }: any) => {
      if (isScanSkipped) {
        return Promise.resolve(mockTestnetBalances);
      }
      return Promise.resolve(mockBalances);
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
        routes={[ROUTES.account]}
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
            isSorobanPublicEnabled: true,
            isRpcHealthy: true,
            userNotification: {
              enabled: false,
              message: "",
            },
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("account-header"));
    expect(screen.getByTestId("account-header")).toBeDefined();
    expect(
      screen.queryAllByTestId("account-view-user-notification"),
    ).toHaveLength(0);
    expect(
      screen.queryAllByTestId("account-view-sorban-rpc-issue"),
    ).toHaveLength(0);
  });
  it("should show user notification if user notification is enabled", async () => {
    jest.spyOn(ApiInternal, "loadBackendSettings").mockImplementationOnce(() =>
      Promise.resolve({
        isSorobanPublicEnabled: true,
        isRpcHealthy: true,
        userNotification: {
          enabled: true,
          message: "Test notification",
        },
      }),
    );
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
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isSorobanPublicEnabled: true,
            isRpcHealthy: true,
            userNotification: {
              enabled: false,
              message: "",
            },
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("account-view-user-notification"),
      ).toBeInTheDocument();
    });
  });

  it("should show soroban rpc issue notification if soroban rpc is not supported", async () => {
    jest.spyOn(ApiInternal, "loadBackendSettings").mockImplementationOnce(() =>
      Promise.resolve({
        isSorobanPublicEnabled: false,
        isRpcHealthy: false,
        userNotification: {
          enabled: false,
          message: "",
        },
      }),
    );
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
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isSorobanPublicEnabled: true,
            isRpcHealthy: true,
            userNotification: {
              enabled: false,
              message: "",
            },
          },
        }}
      >
        <Account />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("account-view-sorban-rpc-issue"),
      ).toBeInTheDocument();
    });
  });

  it("displays balances with icons", async () => {
    const iconBalances = {
      balances: {
        ["USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
          token: {
            code: "USDC",
            issuer: {
              key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
            },
          },
          total: new BigNumber("100"),
          available: new BigNumber("100"),
          blockaidData: {},
        },
        ["FOO:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
          token: {
            code: "FOO",
            issuer: {
              key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
            },
          },
          total: new BigNumber("100"),
          available: new BigNumber("100"),
          blockaidData: {},
        },
        ["BAZ:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
          token: {
            code: "BAZ",
            issuer: {
              key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
            },
          },
          total: new BigNumber("100"),
          available: new BigNumber("100"),
          blockaidData: {},
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
    const getIconFromTokenListSpy = jest.spyOn(
      GetIconFromTokenList,
      "getIconFromTokenLists",
    );
    const getIconUrlFromIssuerSpy = jest
      .spyOn(GetIconUrlFromIssuer, "getIconUrlFromIssuer")
      .mockImplementation(() => Promise.resolve("http://domain.com/baz.png"));
    jest
      .spyOn(ApiInternal, "getAccountHistory")
      .mockImplementationOnce(() => Promise.resolve({ operations: [] } as any));
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementationOnce(() => Promise.resolve(iconBalances));

    jest.spyOn(ApiInternal, "getAssetIconCache").mockImplementation(() =>
      Promise.resolve({
        icons: {
          "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM":
            "http://domain.com/icon.png",
        },
      }),
    );

    jest.spyOn(ApiInternal, "getAssetIcons").mockRestore();

    const assetsListsData = [
      {
        assets: [
          {
            code: "FOO",
            issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
            name: "FOO",
            icon: "http://domain.com/foo.png",
          },
        ],
      },
    ] as any;
    jest
      .spyOn(TokenListHelpers, "getCombinedAssetListData")
      .mockImplementation(() => Promise.resolve(assetsListsData));

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

    await waitFor(() => {
      const assetNodes = screen.getAllByTestId("account-assets-item");
      expect(assetNodes.length).toEqual(4);

      // fetches and displays icon from background cache
      expect(
        screen.getByTestId("AccountAssets__asset--loading-USDC"),
      ).toContainHTML(
        "<img alt='USDC logo' src='http://domain.com/icon.png' />",
      );

      // fetches and displays icon from token list
      expect(
        screen.getByTestId("AccountAssets__asset--loading-FOO"),
      ).toContainHTML("<img alt='FOO logo' src='http://domain.com/foo.png' />");
      expect(getIconFromTokenListSpy).toHaveBeenCalledWith({
        issuerId: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        contractId: undefined,
        code: "FOO",
        assetsListsData: assetsListsData,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      expect(getIconFromTokenListSpy).toHaveBeenCalledTimes(2);

      expect(getIconUrlFromIssuerSpy).toHaveBeenCalledTimes(1);

      // fetches and displays icon from home domain
      expect(
        screen.getByTestId("AccountAssets__asset--loading-BAZ"),
      ).toContainHTML("<img alt='BAZ logo' src='http://domain.com/baz.png' />");
    });
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
    fireEvent.click(screen.getByTestId("history-item"));

    await waitFor(() => {
      expect(screen.getByTestId("TransactionDetailModal")).toBeDefined();
      expect(
        screen.getByTestId("TransactionDetailModal__subtitle-date"),
      ).toHaveTextContent("Oct 07 2025");
      expect(
        screen.getByTestId("TransactionDetailModal__src-amount"),
      ).toHaveTextContent("100 USDC");
      expect(
        screen.getByTestId("TransactionDetailModal__dst-amount"),
      ).toHaveTextContent("G2…G2");
      expect(
        screen.getByTestId("TransactionDetailModal__status"),
      ).toHaveTextContent("Success");
    });
  });

  it("goes to account details and shows loading until history data is fetched", async () => {
    jest.useFakeTimers();
    jest
      .spyOn(ApiInternal, "getAccountHistory")
      .mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockHistoryOperations.operations), 5000),
          ),
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
      expect(screen.getByTestId("AssetDetail__list__loader")).toBeDefined();
    });
    jest.advanceTimersByTime(5000);
    await waitFor(() => {
      expect(screen.getByTestId("history-item")).toHaveTextContent("100 USDC");
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
      ).toHaveTextContent("$834,463.67");
      expect(
        screen.getByTestId(`asset-price-delta-${TEST_CANONICAL}`),
      ).toHaveTextContent("3.97%");
      expect(screen.getByTestId(`asset-amount-native`)).toHaveTextContent(
        "$13.81",
      );
      expect(screen.getByTestId(`asset-price-delta-native`)).toHaveTextContent(
        "1.09%",
      );
    });
  });

  it("hides prices and deltas on token price failure", async () => {
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

    jest.spyOn(ApiInternal, "getTokenPrices").mockImplementation(() => {
      throw new Error("Failed to fetch prices");
    });

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
        screen.queryByTestId(`asset-amount-${TEST_CANONICAL}`),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("asset-price-delta-native")).toHaveTextContent(
        "--",
      );
      expect(
        screen.getByTestId(`asset-price-delta-${TEST_CANONICAL}`),
      ).toHaveTextContent("--");
      expect(
        screen.queryByTestId("account-view-total-balance"),
      ).toBeEmptyDOMElement();
    });
  });

  it("polls for account balances", async () => {
    jest.useFakeTimers();
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
    const getAccountBalancesSpy = jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));

    jest.spyOn(ApiInternal, "getTokenPrices").mockImplementation(() => {
      throw new Error("Failed to fetch prices");
    });

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
      expect(getAccountBalancesSpy).toHaveBeenCalledTimes(2);
    });

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);
    expect(getAccountBalancesSpy).toHaveBeenCalledTimes(3);
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

  it("handles expired session unlock account routing", async () => {
    jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
      Promise.resolve({
        hasPrivateKey: true,
        publicKey: "",
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        allAccounts: mockAccounts,
        bipPath: "bip-path",
        tokenIdList: [],
      }),
    );

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
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
            path={ROUTES.unlockAccount}
            element={<div data-testid="rerouted" />}
          />
        </ReactRouterDom.Routes>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("rerouted")).toBeInTheDocument();
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
      refreshAppData: jest.fn(),
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
