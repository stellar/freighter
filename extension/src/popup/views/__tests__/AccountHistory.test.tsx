import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import {
  APPLICATION_STATE,
  APPLICATION_STATE as ApplicationState,
} from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";
import * as TokenListHelpers from "@shared/api/helpers/token-list";

import {
  Wrapper,
  mockAccounts,
  mockAccountHistory,
  mockBalances,
} from "../../__testHelpers__";
import { AccountHistory } from "../AccountHistory";
import { ROUTES } from "popup/constants/routes";
import { SettingsState } from "@shared/api/types";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";
import * as ExtensionMessaging from "@shared/api/helpers/extensionMessaging";

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    ...original,
    StellarToml: {
      Resolver: {
        resolve: jest.fn().mockResolvedValue({
          CURRENCIES: [
            {
              code: "USDC",
              issuer: "G3",
              image: "http://tomldomain.com/baz.png",
            },
          ],
        }),
      },
    },
  };
});

jest.spyOn(ApiInternal, "getAssetIconCache").mockImplementation(() =>
  Promise.resolve({
    icons: {},
  }),
);

jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
  Promise.resolve({
    hasPrivateKey: true,
    publicKey: "G1",
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
  .spyOn(ApiInternal, "getAccountHistory")
  .mockImplementation(() => Promise.resolve(mockAccountHistory as any));

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(mockBalances));

jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() =>
  Promise.resolve({
    hiddenAssets: {},
    error: "",
  }),
);

jest
  .spyOn(ApiInternal, "getAssetIcons")
  .mockImplementation(() => Promise.resolve({}));

jest
  .spyOn(TokenListHelpers, "getCombinedAssetListData")
  .mockImplementation(() => Promise.resolve([]));

const homeDomainsSpy = jest
  .spyOn(ApiInternal, "getAssetDomains")
  .mockImplementation(() =>
    Promise.resolve({
      G3: "example.com",
    }),
  );

jest
  .spyOn(ExtensionMessaging, "sendMessageToBackground")
  .mockImplementation(() => Promise.resolve({} as any));

describe("AccountHistory", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it("loads account history view with all transactions", async () => {
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
            isHideDustEnabled: false,
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(4);
    const historyNodeAmounts = screen.getAllByTestId(
      "history-item-amount-component",
    );
    await waitFor(() =>
      expect(historyNodeAmounts[0]).toHaveTextContent("+1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[1]).toHaveTextContent("+0.1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[2]).toHaveTextContent("+0.01 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[3]).toHaveTextContent("-0.1 USDC"),
    );
  });
  it("hides dust transactions", async () => {
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
            isHideDustEnabled: true,
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(2);
    await waitFor(() => screen.getAllByTestId("history-item"));
    const historyNodeAmounts = screen.getAllByTestId(
      "history-item-amount-component",
    );
    await waitFor(() =>
      expect(historyNodeAmounts[0]).toHaveTextContent("+1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[1]).toHaveTextContent("-0.1 USDC"),
    );
  });
  it("makes one request to get needed home domains", async () => {
    jest.spyOn(ApiInternal, "getAccountHistory").mockImplementation(() =>
      Promise.resolve([
        ...mockAccountHistory,
        {
          amount: "1.0000000",
          asset_type: "credit_alphanum4",
          asset_issuer: "G4",
          asset_code: "USDC",
          created_at: "2024-10-14T20:35:26Z",
          from: "G2",
          id: "6",
          paging_token: "1916427292381185",
          source_account: "G2",
          to: "G1",
          transaction_attr: {
            operation_count: 1,
          },
          transaction_hash:
            "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
          transaction_successful: true,
          type: "path_payment_strict_send",
          type_i: 1,
        },
        {
          amount: "0.1000000",
          asset_type: "native",
          created_at: "2024-10-14T20:35:26Z",
          from: "G2",
          id: "7",
          paging_token: "1916427292381185",
          source_account: "G2",
          to: "G1",
          transaction_attr: {
            operation_count: 1,
          },
          transaction_hash:
            "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
          transaction_successful: true,
          type: "payment",
          type_i: 1,
        },
        {
          amount: "0.010000",
          asset_type: "native",
          created_at: "2024-10-14T20:35:26Z",
          from: "G2",
          id: "8",
          paging_token: "1916427292381185",
          source_account: "G2",
          to: "G1",
          transaction_attr: {
            operation_count: 1,
          },
          transaction_hash:
            "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
          transaction_successful: true,
          type: "payment",
          type_i: 1,
        },
        {
          amount: "0.100000",
          asset_issuer: "G3",
          asset_code: "USDC",
          created_at: "2024-10-14T20:35:26Z",
          from: "G1",
          id: "9",
          paging_token: "1916427292381185",
          source_account: "G1",
          to: "G2",
          transaction_attr: {
            operation_count: 1,
          },
          transaction_hash:
            "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
          transaction_successful: true,
          type: "payment",
          type_i: 1,
        },
      ] as any),
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
            isHideDustEnabled: false,
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(8);
    expect(homeDomainsSpy).toHaveBeenCalledTimes(1);
    expect(homeDomainsSpy).toHaveBeenCalledWith({
      assetIssuerDomainsToFetch: ["G3", "G4"],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
  });
});
