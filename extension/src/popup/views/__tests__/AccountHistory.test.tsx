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
import * as GetIconFromTokenList from "@shared/api/helpers/getIconFromTokenList";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";

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
                            image:
                              "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
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
    // Verify the collectible image is displayed in the history item
    const historyImage = screen.getByTestId("account-collectible-image");
    expect(historyImage).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
    );
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
    // Verify the collectible image is displayed in the transaction detail modal
    const modalImages = screen.getAllByTestId("account-collectible-image");
    expect(modalImages.length).toBeGreaterThan(0);
    expect(modalImages[modalImages.length - 1]).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
    );
  });

  it("renders received collectible transactions", async () => {
    jest.spyOn(ApiInternal, "getAccountHistory").mockImplementation(() =>
      Promise.resolve([
        {
          id: "260023552098807810",
          paging_token: "260023552098807810",
          transaction_successful: true,
          source_account: "G2",
          type: "invoke_host_function",
          type_i: 24,
          created_at: "2025-12-31T19:17:31Z",
          transaction_hash:
            "164b715046d4a39ad6e163c1d3b2207dd94e1ac4fbdecdbbb7cd38325a802757",
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
                          owner: "G1",
                          tokenId: "1",
                          tokenUri: "https://nftcalendar.io/token/1",
                          metadata: {
                            name: "Stellar Frog Collectible 1",
                            description: "This is a received frog",
                            image:
                              "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                            attributes: [
                              {
                                traitType: "Background",
                                value: "Green",
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
    expect(historyNodes[0]).toHaveTextContent("Received");
    // Verify the collectible image is displayed in the history item
    const historyImage = screen.getByTestId("account-collectible-image");
    expect(historyImage).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("history-item"));
    });
    await waitFor(() => screen.getByTestId("TransactionDetailModal"));
    expect(screen.getByTestId("TransactionDetailModal")).toBeDefined();
    expect(
      screen.getByTestId("TransactionDetailModal__src-collectible-name"),
    ).toHaveTextContent("Stellar Frog Collectible 1");
    expect(
      screen.getByTestId("TransactionDetailModal__src-collection-name"),
    ).toHaveTextContent("Stellar Frogs #1");
    // Verify the collectible image is displayed in the transaction detail modal
    const modalImages = screen.getAllByTestId("account-collectible-image");
    expect(modalImages.length).toBeGreaterThan(0);
    expect(modalImages[modalImages.length - 1]).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
    );
  });

  it("renders multiple collectible transactions", async () => {
    jest.spyOn(ApiInternal, "getAccountHistory").mockImplementation(() =>
      Promise.resolve([
        {
          id: "260023552098807811",
          paging_token: "260023552098807811",
          transaction_successful: true,
          source_account: "G1",
          type: "invoke_host_function",
          type_i: 24,
          created_at: "2025-12-29T19:17:31Z",
          transaction_hash:
            "264b715046d4a39ad6e163c1d3b2207dd94e1ac4fbdecdbbb7cd38325a802758",
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
        {
          id: "260023552098807812",
          paging_token: "260023552098807812",
          transaction_successful: true,
          source_account: "G2",
          type: "invoke_host_function",
          type_i: 24,
          created_at: "2025-12-28T19:17:31Z",
          transaction_hash:
            "364b715046d4a39ad6e163c1d3b2207dd94e1ac4fbdecdbbb7cd38325a802759",
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
                          owner: "G1",
                          tokenId: "3",
                          tokenUri: "https://nftcalendar.io/token/3",
                          metadata: {
                            name: "Stellar Frog Collectible 3",
                            description: "This is a test frog",
                            image:
                              "https://nftcalendar.io/storage/uploads/events/2023/8/5kFeYwNfhpUST3TsSoLxm7FaGY1ljwLRgfZ5gQnV.jpg",
                            attributes: [
                              {
                                traitType: "Background",
                                value: "Blue",
                              },
                            ],
                          },
                        },
                        {
                          collectionName: "Stellar Frogs",
                          collectionAddress:
                            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                          owner: "G1",
                          tokenId: "4",
                          tokenUri: "https://nftcalendar.io/token/4",
                          metadata: {
                            name: "Stellar Frog Collectible 4",
                            description: "This is another test frog",
                            image:
                              "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                            attributes: [
                              {
                                traitType: "Background",
                                value: "Yellow",
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
    expect(historyNodes.length).toEqual(2);
    const labels = screen.getAllByTestId("history-item-label");
    expect(labels[0]).toHaveTextContent("Stellar Frogs");
    expect(labels[1]).toHaveTextContent("Stellar Frogs");
    // Verify the collectible images are displayed in the history items
    const historyImages = screen.getAllByTestId("account-collectible-image");
    expect(historyImages.length).toBeGreaterThanOrEqual(2);
    expect(historyImages[0]).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/8/5kFeYwNfhpUST3TsSoLxm7FaGY1ljwLRgfZ5gQnV.jpg",
    );
    expect(historyImages[1]).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
    );
  });

  it("renders collectible transaction with missing metadata", async () => {
    jest.spyOn(ApiInternal, "getAccountHistory").mockImplementation(() =>
      Promise.resolve([
        {
          id: "260023552098807813",
          paging_token: "260023552098807813",
          transaction_successful: true,
          source_account: "G1",
          type: "invoke_host_function",
          type_i: 24,
          created_at: "2025-12-27T19:17:31Z",
          transaction_hash:
            "464b715046d4a39ad6e163c1d3b2207dd94e1ac4fbdecdbbb7cd38325a802760",
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
                          owner: "G1",
                          tokenId: "5",
                          tokenUri: "https://nftcalendar.io/token/5",
                          metadata: null,
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
    // Verify that when metadata is null, a placeholder is shown instead of an image
    const placeholder = screen.getByTestId("account-collectible-placeholder");
    expect(placeholder).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByTestId("history-item"));
    });
    await waitFor(() => screen.getByTestId("TransactionDetailModal"));
    expect(screen.getByTestId("TransactionDetailModal")).toBeDefined();
    // When metadata is null, it should still display the tokenId with fallback format
    expect(
      screen.getByTestId("TransactionDetailModal__src-collectible-name"),
    ).toHaveTextContent("Token #5");
    // Verify placeholder is also shown in the modal when metadata is null
    const modalPlaceholders = screen.getAllByTestId(
      "account-collectible-placeholder",
    );
    expect(modalPlaceholders.length).toBeGreaterThan(0);
  });

  it("uses icons from token lists for account history transactions", async () => {
    const tokenListIconUrl = "https://example.com/token-list-usdc-icon.png";
    const tokenList: AssetListResponse = {
      name: "Test Token List",
      description: "Test list for USDC",
      network: "testnet",
      version: "1.0",
      provider: "test",
      assets: [
        {
          code: "USDC",
          issuer: "G3",
          contract: "",
          domain: "example.com",
          icon: tokenListIconUrl,
          decimals: 7,
          name: "USD Coin",
        },
      ],
    };

    jest
      .spyOn(TokenListHelpers, "getCombinedAssetListData")
      .mockImplementation(() => Promise.resolve([tokenList]));

    const getIconFromTokenListsSpy = jest.spyOn(
      GetIconFromTokenList,
      "getIconFromTokenLists",
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
            tokenLists: [tokenList],
            tokenDetails: {},
            historyData: {},
            tokenPrices: {},
            collections: {},
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();

    // Wait for the USDC transaction to be processed and rendered
    await waitFor(() => {
      const historyItems = screen.getAllByTestId("history-item");
      return historyItems.some((item) => item.textContent?.includes("USDC"));
    });

    // Verify that getIconFromTokenLists was called with the token list data
    // This confirms that the code is checking token lists for icons first
    expect(getIconFromTokenListsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        issuerId: "G3",
        code: "USDC",
        assetsListsData: [tokenList],
      }),
    );

    // Verify that the function was called for USDC with the token list data
    const usdcCall = getIconFromTokenListsSpy.mock.calls.find(
      (call) => call[0].code === "USDC" && call[0].issuerId === "G3",
    );
    expect(usdcCall).toBeDefined();
    expect(usdcCall?.[0].assetsListsData).toEqual([tokenList]);

    // Verify the USDC transaction is displayed
    const historyItems = screen.getAllByTestId("history-item");
    const usdcHistoryItem = historyItems.find((item) =>
      item.textContent?.includes("USDC"),
    );
    expect(usdcHistoryItem).toBeDefined();
  });

  it("uses icons from token lists for Soroban token transfer transactions", async () => {
    const contractId =
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
    const tokenSymbol = "TEST";
    const tokenListIconUrl = "https://example.com/token-transfer-icon.png";
    const tokenList: AssetListResponse = {
      name: "Test Token List",
      description: "Test list for Soroban token",
      network: "testnet",
      version: "1.0",
      provider: "test",
      assets: [
        {
          code: tokenSymbol,
          issuer: "",
          contract: contractId,
          domain: "",
          icon: tokenListIconUrl,
          decimals: 7,
          name: "Test Token",
        },
      ],
    };

    jest
      .spyOn(TokenListHelpers, "getCombinedAssetListData")
      .mockImplementation(() => Promise.resolve([tokenList]));

    const getIconFromTokenListsSpy = jest.spyOn(
      GetIconFromTokenList,
      "getIconFromTokenLists",
    );

    // Mock getAttrsFromSorobanHorizonOp to return transfer attributes
    const sorobanHelpers = await import("popup/helpers/soroban");
    jest.spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp").mockReturnValue({
      fnName: SorobanTokenInterface.transfer,
      contractId,
      from: "G1",
      to: "G2",
      amount: 100000000,
    });

    // Mock getTokenDetails to return token details
    jest.spyOn(ApiInternal, "getTokenDetails").mockImplementation(() =>
      Promise.resolve({
        symbol: tokenSymbol,
        decimals: 7,
        name: "Test Token",
      }),
    );

    // Create a token transfer transaction
    const tokenTransferHistory = [
      {
        id: "token-transfer-1",
        paging_token: "token-transfer-1",
        transaction_successful: true,
        source_account: "G1",
        type: "invoke_host_function",
        type_i: 24,
        created_at: "2024-10-15T20:35:26Z",
        transaction_hash: "token-transfer-hash",
        function: "HostFunctionTypeHostFunctionTypeInvokeContract",
        parameters: [],
        address: "",
        salt: "",
        asset_balance_changes: null,
        transaction_attr: {
          operation_count: 1,
          envelope_xdr: "test-xdr",
        },
      },
    ];

    jest
      .spyOn(ApiInternal, "getAccountHistory")
      .mockImplementation(() => Promise.resolve(tokenTransferHistory as any));

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
            tokenLists: [tokenList],
            tokenDetails: {},
            historyData: {},
            tokenPrices: {},
            collections: {},
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();

    // Wait for the token transfer transaction to be processed
    await waitFor(
      () => {
        const historyItems = screen.getAllByTestId("history-item");
        return historyItems.some((item) =>
          item.textContent?.includes(tokenSymbol),
        );
      },
      { timeout: 3000 },
    );

    // Verify that getIconFromTokenLists was called
    // Note: For Soroban tokens, getIconUrl is called with code (symbol) and empty issuer,
    // so getIconFromTokenLists will be called with those parameters
    expect(getIconFromTokenListsSpy).toHaveBeenCalled();

    // Verify the token transfer transaction is displayed
    const historyItems = screen.getAllByTestId("history-item");
    const tokenTransferItem = historyItems.find((item) =>
      item.textContent?.includes(tokenSymbol),
    );
    expect(tokenTransferItem).toBeDefined();
  });
});
