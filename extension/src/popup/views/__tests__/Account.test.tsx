import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { Horizon } from "stellar-sdk";
import BigNumber from "bignumber.js";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { Balances } from "@shared/api/types";
import * as ApiInternal from "@shared/api/internal";
import * as ExtensionMessaging from "@shared/api/helpers/extensionMessaging";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import * as UseAssetDomain from "popup/helpers/useAssetDomain";
import { INDEXER_URL } from "@shared/constants/mercury";
import { SERVICE_TYPES } from "@shared/constants/services";
import { Response } from "@shared/api/types";

import { Wrapper, mockBalances, mockAccounts } from "../../__testHelpers__";
import { Account } from "../Account";

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

jest.spyOn(global, "fetch").mockImplementation((url) => {
  if (
    url ===
    `${INDEXER_URL}/scan-asset-bulk?asset_ids=USDC-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM`
  ) {
    return Promise.resolve({
      json: async () => {
        return {
          data: {
            results: {
              "USDC-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM": {
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
                  { description: "", feature_id: "METADATA", type: "Benign" },
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
});

jest
  .spyOn(ApiInternal, "getHiddenAssets")
  .mockImplementation(() => Promise.resolve({ hiddenAssets: {}, error: "" }));

jest
  .spyOn(ApiInternal, "getAccountIndexerBalances")
  .mockImplementation(() => Promise.resolve(mockBalances));

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

// @ts-ignore
jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
  Promise.resolve({
    publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    tokenIdList: ["C1"],
    hasPrivateKey: false,
    applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: mockAccounts,
    bipPath: "foo",
  }),
);

jest
  .spyOn(ApiInternal, "getTokenIds")
  .mockImplementation(() => Promise.resolve(["C1"]));

jest
  .spyOn(ApiInternal, "makeAccountActive")
  .mockImplementation(() =>
    Promise.resolve({ publicKey: "G2", hasPrivateKey: true, bipPath: "" }),
  );

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

describe("Account view", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    render(
      <Wrapper
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
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
      expect(assetNodes.length).toEqual(2);
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
    const customMainnet = {
      network: "STANDALONE",
      networkName: "Custom Network",
      networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
      networkUrl: TESTNET_NETWORK_DETAILS.networkUrl,
    };

    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
      expect(assetNodes.length).toEqual(2);
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
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
      .spyOn(ApiInternal, "getAccountIndexerBalances")
      .mockImplementation(() => Promise.resolve(mockLpBalance));

    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
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
});
