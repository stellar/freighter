import React from "react";
import {
  act,
  render,
  waitFor,
  screen,
  fireEvent,
} from "@testing-library/react";
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
  it("renders sent collectible transactions", async () => {
    jest.spyOn(ApiInternal, "getAccountHistory").mockImplementation(() =>
      Promise.resolve([
        {
          id: "260023552098807809",
          paging_token: "260023552098807809",
          transaction_successful: true,
          source_account: "G1",
          type: "invoke_host_function",
          type_i: 24,
          created_at: "2025-12-30T19:17:31Z",
          transaction_hash:
            "064b715046d4a39ad6e163c1d3b2207dd94e1ac4fbdecdbbb7cd38325a802756",
          function: "HostFunctionTypeHostFunctionTypeInvokeContract",
          parameters: [
            {
              value: "AAAAEgAAAAGnhiOsJ5pUi9/r9CO2pue/iCYdJydn9iB+MNVZXxopQQ==",
              type: "Address",
            },
            {
              value: "AAAADwAAAAh0cmFuc2Zlcg==",
              type: "Sym",
            },
            {
              value:
                "AAAAEgAAAAAAAAAAVWZH80/CFAnOvHGpWuoVnzcfL0eY/i2tJ0H91fuwBmM=",
              type: "Address",
            },
            {
              value:
                "AAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+Q=",
              type: "Address",
            },
            {
              value: "AAAAAwAAAAI=",
              type: "U32",
            },
          ],
          address: "",
          salt: "",
          asset_balance_changes: null,
          transaction_attr: {
            operation_count: 1,
            envelope_xdr:
              "AAAAAgAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwADBzcCkAfAAAAAJAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABp4YjrCeaVIvf6/Qjtqbnv4gmHScnZ/YgfjDVWV8aKUEAAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAVWZH80/CFAnOvHGpWuoVnzcfL0eY/i2tJ0H91fuwBmMAAAASAAAAAAAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAMAAAACAAAAAQAAAAAAAAAAAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAADAAAAAgAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAFAAAAAEAAAAHP3eS4onfldMZntnbNaDPKlFUqmTNcpioxEG3FwIwY1sAAAAGAAAABgAAAAGnhiOsJ5pUi9/r9CO2pue/iCYdJydn9iB+MNVZXxopQQAAABAAAAABAAAAAgAAAA8AAAAIQXBwcm92YWwAAAADAAAAAgAAAAAAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAAQAAAAYAAAABp4YjrCeaVIvf6/Qjtqbnv4gmHScnZ/YgfjDVWV8aKUEAAAAQAAAAAQAAAAIAAAAPAAAAB0JhbGFuY2UAAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAABAAAABgAAAAGnhiOsJ5pUi9/r9CO2pue/iCYdJydn9iB+MNVZXxopQQAAABAAAAABAAAAAgAAAA8AAAAFT3duZXIAAAAAAAADAAAAAgAAAAEAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAEAAAAAEAAAACAAAADwAAAAtPd25lclRva2VucwAAAAASAAAAAAAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAAEAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAEAAAAAEAAAACAAAADwAAAAtPd25lclRva2VucwAAAAASAAAAAAAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAEAGUJpAAAAAAAAAsgAAAAAAAIytgAAAAH7sAZjAAAAQM5wSOQ0vtlDZI9aFKgaH6Qq2tGfqZyOYubQTDIIE0EgPjP0eiObOSE2VXo7MRv1ppM6l2ps3z11S7/A2trCugU=",
          },
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
          cache: {
            balanceData: {
              [TESTNET_NETWORK_DETAILS.network]: {
                G1: {
                  balances: {},
                },
              },
            },
            icons: {},
            homeDomains: {},
            tokenLists: [],
            tokenDetails: {},
            historyData: {},
            tokenPrices: {},
            collections: {
              [TESTNET_NETWORK_DETAILS.network]: {
                G1: [
                  {
                    collection: {
                      address:
                        "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
                      name: "Stellar Frogs",
                      symbol: "SFROG",
                      collectibles: [
                        {
                          collectionName: "Stellar Frogs",
                          collectionAddress:
                            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                          owner:
                            "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                          tokenId: "2",
                          tokenUri: "https://nftcalendar.io/token/1",
                          metadata: {
                            name: "Stellar Frog Collectible 2",
                            description: "This is a test frog",
                            attributes: [
                              {
                                traitType: "Background",
                                value: "Red",
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(1);
    expect(screen.getByTestId("history-item-label")).toHaveTextContent(
      "Stellar Frogs",
    );
    expect(
      screen.getByTestId("history-item-amount-component"),
    ).toHaveTextContent("Dec 30");
    expect(historyNodes[0]).toHaveTextContent("Sent");
    await act(async () => {
      fireEvent.click(screen.getByTestId("history-item"));
    });
    await waitFor(() => screen.getByTestId("TransactionDetailModal"));
    expect(screen.getByTestId("TransactionDetailModal")).toBeDefined();
    expect(
      screen.getByTestId("TransactionDetailModal__subtitle-date"),
    ).toHaveTextContent("Dec 30");
    expect(
      screen.getByTestId("TransactionDetailModal__src-collectible-name"),
    ).toHaveTextContent("Stellar Frog Collectible 2");
    expect(
      screen.getByTestId("TransactionDetailModal__src-collection-name"),
    ).toHaveTextContent("Stellar Frogs #2");
  });
});
