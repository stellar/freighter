import React from "react";
import { Asset } from "stellar-sdk";
import {
  render,
  waitFor,
  screen,
  act,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BigNumber from "bignumber.js";

import { AssetDetail } from "popup/components/account/AssetDetail";
import { ROUTES } from "popup/constants/routes";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import * as ApiInternal from "@shared/api/internal";
import {
  densePoints,
  makeHistory,
} from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { mockAccounts, Wrapper, mockBalances } from "popup/__testHelpers__";
import {
  installPointerEventPolyfill,
  mockChartRect,
} from "popup/__testHelpers__/pointerEvents";
import { resetCacheWriteClaims } from "helpers/cacheWrites";
import { RANGE_SWITCH_DEBOUNCE_MS } from "popup/components/account/TokenPriceChart/constants";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountHistoryData } from "popup/views/Account/hooks/useGetAccountHistoryData";

// jest-fixed-jsdom has no PointerEvent; without this, fireEvent.pointerDown/
// pointerUp below would silently drop clientX/pointerId.
installPointerEventPolyfill();

const mockHistoryData = {
  type: AppDataType.RESOLVED,
  operationsByAsset: {
    native: [
      {
        fetchTokenDetailsaction: "Received",
        actionIcon: "received",

        amount: "+0 XLM",

        date: "Sep 19",
        id: "253426134438383665",

        metadata: {
          createdAt: "2025-09-19T21:15:45Z",
          feeCharged: "10000",
          memo: "Buy NXR Earn Native XLM!",
          type: "payment",
          isDustPayment: true,
          isPayment: true,
          isReceiving: true,
          nonLabelAmount: "0 XLM",
          to: "G1",
        },
        rowIcon: <></>,
        rowText: "XLM",
      },
    ],
  },
} as any;

// These call backend-v2 through the FETCH_BACKEND_V2 background message
// (#2879), which has no listener in this test env — so unmocked they hang
// (never resolve or reject) rather than fail fast. getAssetDomains (via
// getLedgerKeyAccounts) gates AssetDetail's render: without it the asset-domain
// fetch never settles and the view is stuck on <Loading />. getTokenPrices is
// stubbed for the same reason (mirrors Send.test.tsx). Both resolve empty since
// these tests seed prices in the redux cache and assert on balances.
jest
  .spyOn(ApiInternal, "getTokenPrices")
  .mockImplementation(() => Promise.resolve({}));
jest
  .spyOn(ApiInternal, "getAssetDomains")
  .mockImplementation(() => Promise.resolve({} as any));

describe("AssetDetail", () => {
  // The in-flight request map is module scope; a test that leaves a request
  // parked must not hand it to the next test's mount fetch.
  afterEach(() => {
    resetCacheWriteClaims();
  });

  it("renders asset detail", async () => {
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));
    const props = {
      handleClose: () => null,
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: { type: "native", code: "XLM" },
            total: new BigNumber(10),
          },
        ],
      } as any,
      assetOperations: [
        {
          amount: "0.1000000",
          asset_type: "native",
          created_at: "2025-03-27T21:52:26Z",
          from: "G2",
          id: "606990548090881",
          paging_token: "606990548090881",
          source_account: "G2",
          to: "G1",
          transaction_hash:
            "70952a50b7d60c8b64ffb0183002d98aa42fd95c1bea56250435833f0b51f9cb",
          transaction_successful: true,
          transaction_attr: { operation_count: 1 },
          metadata: {},
          type: "payment",
          type_i: 1,
        },
      ] as any,
      selectedAsset: "native",
      setIsDetailViewShowing: () => null,
      historyData: mockHistoryData,
    };

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <AssetDetail {...props} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("AssetDetail"));
    expect(screen.getByTestId("AssetDetail")).toBeDefined();

    // The native asset's NAME, not its code. The balance list and the token
    // picker both already show "Stellar Lumens"; this header was the one
    // place still reading "XLM".
    expect(screen.getByText("Stellar Lumens")).toBeInTheDocument();
  });
  it("should hide dust payment if configured", async () => {
    const props = {
      handleClose: () => null,
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: { type: "native", code: "XLM" },
            total: new BigNumber(10),
          },
        ],
      } as any,
      assetOperations: [
        {
          amount: "0.01",
          asset_type: "native",
          created_at: "2025-03-27T21:52:26Z",
          from: "G2",
          id: "606990548090881",
          paging_token: "606990548090881",
          source_account: "G2",
          to: "G1",
          transaction_hash:
            "70952a50b7d60c8b64ffb0183002d98aa42fd95c1bea56250435833f0b51f9cb",
          transaction_successful: true,
          transaction_attr: { operation_count: 1 },
          metadata: {
            isDustPayment: true,
          },
          type: "payment",
          type_i: 1,
        },
      ] as any,
      selectedAsset: "native",
      setIsDetailViewShowing: () => null,
      historyData: mockHistoryData,
    };

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            isHideDustEnabled: true,
          },
        }}
      >
        <AssetDetail {...props} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("AssetDetail__empty"));
    expect(screen.getByTestId("AssetDetail__empty")).toBeVisible();
  });
  it("should not hide dust payment if not configured", async () => {
    const props = {
      handleClose: () => null,
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: { type: "native", code: "XLM" },
            total: new BigNumber(10),
          },
        ],
      } as any,
      assetOperations: [
        {
          amount: "0.01",
          asset_type: "native",
          created_at: "2025-03-27T21:52:26Z",
          from: "G2",
          id: "606990548090881",
          paging_token: "606990548090881",
          source_account: "G2",
          to: "G1",
          transaction_hash:
            "70952a50b7d60c8b64ffb0183002d98aa42fd95c1bea56250435833f0b51f9cb",
          transaction_successful: true,
          transaction_attr: { operation_count: 1 },
          metadata: {
            isDustPayment: true,
          },
          type: "payment",
          type_i: 1,
        },
      ] as any,
      selectedAsset: "native",
      setIsDetailViewShowing: () => null,
      historyData: mockHistoryData,
    };

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            isHideDustEnabled: false,
          },
        }}
      >
        <AssetDetail {...props} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("AssetDetail__list"));
    expect(screen.getByTestId("AssetDetail__list")).not.toBeEmptyDOMElement();
  });
  it("keeps the asset detail behind an opened transaction", async () => {
    const props = {
      handleClose: () => null,
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: { type: "native", code: "XLM" },
            total: new BigNumber(10),
          },
        ],
      } as any,
      selectedAsset: "native",
      historyData: mockHistoryData,
    };

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            isHideDustEnabled: false,
          },
        }}
      >
        <AssetDetail {...props} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("history-item"));
    fireEvent.click(screen.getByTestId("history-item"));

    await waitFor(() => screen.getByTestId("TransactionDetailModal"));
    // The sheet's backdrop is translucent, so the asset detail has to stay
    // rendered underneath it.
    expect(screen.getByTestId("AssetDetail")).toBeInTheDocument();
  });
  it("should display all balances", async () => {
    const props = {
      handleClose: () => null,
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: { type: "native", code: "XLM" },
            total: new BigNumber(10),
          },
          {
            available: new BigNumber(10),
            token: {
              type: "credit_alphanum12",
              code: "FOO",
              issuer: {
                key: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
              },
            },
            total: new BigNumber(10),
          },
          {
            available: new BigNumber(100),
            token: {
              type: "credit_alphanum12",
              code: "BAZ",
              issuer: {
                key: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
              },
            },
            total: new BigNumber(100),
          },
        ],
        icons: {},
      } as any,
      assetOperations: [] as any,
      selectedAsset:
        "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      setIsDetailViewShowing: () => null,
      historyData: mockHistoryData,
    };

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
          cache: {
            icons: {
              "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
                "test-img-src",
            },
            tokenPrices: {
              [TESTNET_NETWORK_DETAILS.networkPassphrase]: {
                G1: {
                  "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
                    {
                      price: 1,
                      timestamp: 1718236800,
                    },
                },
              },
            },
          },
        }}
      >
        <AssetDetail {...props} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("asset-detail-available-copy"));
    expect(screen.getByTestId("asset-detail-available-copy")).toHaveTextContent(
      "100 BAZ",
    );
    expect(screen.getByTestId("AssetDetail__icon")).toHaveAttribute(
      "src",
      "test-img-src",
    );
  });

  describe("SEP-41 header", () => {
    const renderContractToken = (balance: any, selectedAsset: string) =>
      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <AssetDetail
            handleClose={() => null}
            accountBalances={{ balances: [balance] } as any}
            selectedAsset={selectedAsset}
            historyData={mockHistoryData}
          />
        </Wrapper>,
      );

    it("shows the default icon, the token name and $-- for a custom token", async () => {
      const contractId =
        "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
      renderContractToken(
        {
          token: { code: "TKN", issuer: { key: contractId } },
          contractId,
          total: new BigNumber(100),
          decimals: 7,
          name: "Token Name",
          symbol: "TKN",
        },
        `TKN:${contractId}`,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.getByTestId("AssetDetail__soroban-icon")).toBeVisible();
      expect(screen.getByText("Token Name")).toBeInTheDocument();
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        /^\$--$/,
      );
      expect(screen.getByTestId("AssetDetail__price")).toHaveClass(
        "AssetDetail__price--placeholder",
      );
    });

    it("values a priced SEP-41 balance in whole units", async () => {
      const contractId =
        "CBIJBDNZNF4X35BJ4FFZWCDBSCKOP5NB4PLG4SNENRMLAPYG4P5FM6VN";
      const selectedAsset = `SolvBTC:${contractId}`;
      const { container } = render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
            cache: {
              icons: {},
              tokenPrices: {
                [TESTNET_NETWORK_DETAILS.networkPassphrase]: {
                  G1: {
                    [selectedAsset]: { currentPrice: "81597.03" },
                  },
                },
              },
            },
          }}
        >
          <AssetDetail
            handleClose={() => null}
            accountBalances={
              {
                balances: [
                  {
                    token: { code: "SolvBTC", issuer: { key: contractId } },
                    contractId,
                    // Raw 227 at 8 decimals = 0.00000227 SolvBTC.
                    total: new BigNumber(227),
                    decimals: 8,
                    name: "Solv BTC",
                    symbol: "SolvBTC",
                  },
                ],
              } as any
            }
            selectedAsset={selectedAsset}
            historyData={mockHistoryData}
          />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(
        container.querySelector(".AssetDetail__balance-value"),
      ).toHaveTextContent(/\$0\.19$/);
    });

    it("falls back to the symbol when the token's name is missing", async () => {
      const contractId =
        "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
      renderContractToken(
        {
          token: { code: "TKN", issuer: { key: contractId } },
          contractId,
          total: new BigNumber(100),
          decimals: 7,
          symbol: "TKN",
        },
        `TKN:${contractId}`,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(
        screen.getByTestId("AssetDetail").querySelector(".AssetDetail__title"),
      ).toHaveTextContent(/^TKN$/);
    });

    it("keeps the code as the title for a classic asset's SAC", async () => {
      const issuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
      const contractId = new Asset("USDC", issuer).contractId(
        TESTNET_NETWORK_DETAILS.networkPassphrase,
      );
      renderContractToken(
        {
          token: { code: "USDC", issuer: { key: contractId } },
          contractId,
          total: new BigNumber(100),
          decimals: 7,
          name: `USDC:${issuer}`,
          symbol: "USDC",
        },
        `USDC:${contractId}`,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByText(`USDC:${issuer}`)).toBeNull();
      expect(
        screen.getByTestId("AssetDetail").querySelector(".AssetDetail__title"),
      ).toHaveTextContent(/^USDC$/);
    });
  });

  describe("Action Buttons", () => {
    it("should show both send and swap buttons for native asset with balance", async () => {
      const props = {
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              available: new BigNumber(10),
              token: { type: "native", code: "XLM" },
              total: new BigNumber(10),
            },
          ],
        } as any,
        assetOperations: [] as any,
        selectedAsset: "native",
        setSelectedAsset: () => null,
        historyData: mockHistoryData,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("asset-detail-send-button"));
      expect(screen.getByTestId("asset-detail-send-button")).toBeVisible();
      expect(screen.getByTestId("asset-detail-swap-button")).toBeVisible();
    });

    it("should not show send button when balance is 0", async () => {
      const props = {
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              available: new BigNumber(0),
              token: { type: "native", code: "XLM" },
              total: new BigNumber(0),
            },
          ],
        } as any,
        assetOperations: [] as any,
        selectedAsset: "native",
        historyData: mockHistoryData,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByTestId("asset-detail-send-button")).toBeNull();
      expect(screen.getByTestId("asset-detail-swap-button")).toBeVisible();
    });

    it("should not show swap button for Soroban asset", async () => {
      const contractId =
        "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
      const props = {
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              token: { code: "USDC", issuer: { key: contractId } },
              contractId,
              total: new BigNumber(100),
              decimals: 7,
              name: "USD Coin",
              symbol: "USDC",
            },
          ],
        } as any,
        assetOperations: [] as any,
        selectedAsset: `USDC:${contractId}`,
        historyData: mockHistoryData,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByTestId("asset-detail-swap-button")).toBeNull();
      expect(screen.getByTestId("asset-detail-send-button")).toBeVisible();
    });

    it("finds the balance of a contract token whose symbol contains a colon", async () => {
      const contractId =
        "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
      const props = {
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              token: { code: "A:B", issuer: { key: contractId } },
              contractId,
              total: new BigNumber(100),
              decimals: 7,
              name: "Colon Token",
              symbol: "A:B",
            },
          ],
        } as any,
        assetOperations: [] as any,
        selectedAsset: `A:B:${contractId}`,
        historyData: mockHistoryData,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      // The send button renders only when the selected balance was found.
      expect(screen.getByTestId("asset-detail-send-button")).toBeVisible();
    });

    it("should show both buttons for classic asset with balance", async () => {
      const props = {
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              available: new BigNumber(100),
              token: {
                type: "credit_alphanum4",
                code: "USDC",
                issuer: {
                  key: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
                },
              },
              total: new BigNumber(100),
            },
          ],
        } as any,
        assetOperations: [] as any,
        selectedAsset:
          "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        historyData: mockHistoryData,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("asset-detail-send-button"));
      expect(screen.getByTestId("asset-detail-send-button")).toBeVisible();
      expect(screen.getByTestId("asset-detail-swap-button")).toBeVisible();
    });

    it("should not show swap button for liquidity pool share with balance", async () => {
      const liquidityPoolId =
        "67260c4c1807b262ff851b0a3fe141194936bb0215b2f77447f1df11998eabb9";
      const props = {
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              liquidityPoolId,
              total: new BigNumber(100),
              available: new BigNumber(100),
              limit: "1000",
              reserves: [
                {
                  asset: "XLM:native",
                  amount: "1000",
                },
                {
                  asset:
                    "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
                  amount: "1000",
                },
              ] as any,
            },
          ],
        } as any,
        assetOperations: [] as any,
        selectedAsset: `${liquidityPoolId}:lp`,
        historyData: mockHistoryData,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByTestId("asset-detail-swap-button")).toBeNull();
      expect(screen.getByTestId("asset-detail-send-button")).toBeVisible();
    });

    it("should not show any buttons for liquidity pool share with zero balance", async () => {
      const liquidityPoolId =
        "67260c4c1807b262ff851b0a3fe141194936bb0215b2f77447f1df11998eabb9";
      const props = {
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              liquidityPoolId,
              total: new BigNumber(0),
              available: new BigNumber(0),
              limit: "1000",
              reserves: [
                {
                  asset: "XLM:native",
                  amount: "0",
                },
                {
                  asset:
                    "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
                  amount: "0",
                },
              ] as any,
            },
          ],
        } as any,
        assetOperations: [] as any,
        selectedAsset: `${liquidityPoolId}:lp`,
        historyData: mockHistoryData,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey: "G1",
              allAccounts: mockAccounts,
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
            cache: {
              icons: {
                "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
                  "test-img-src",
              },
              tokenPrices: {},
            },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByTestId("asset-detail-swap-button")).toBeNull();
      expect(screen.queryByTestId("asset-detail-send-button")).toBeNull();
    });
  });

  describe("token price chart gating", () => {
    const makeProps = () =>
      ({
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              available: new BigNumber(10),
              token: { type: "native", code: "XLM" },
              total: new BigNumber(10),
            },
          ],
        },
        selectedAsset: "native",
        setIsDetailViewShowing: () => null,
        historyData: mockHistoryData,
      }) as any;

    const makeState = (networkDetails: any, isChartEnabled: boolean) => ({
      auth: {
        error: null,
        applicationState: ApplicationState.PASSWORD_CREATED,
        publicKey: "G1",
        allAccounts: mockAccounts,
      },
      settings: {
        networkDetails,
      },
      remoteConfig: {
        // The flag only counts once the Experiment fetch has settled — the
        // selector treats "not yet known" as off so the kill switch fails
        // closed.
        isInitialized: true,
        use_token_price_history: isChartEnabled,
      },
    });

    it("renders the chart section on mainnet with the flag on", async () => {
      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={makeState(MAINNET_NETWORK_DETAILS, true)}
        >
          <AssetDetail {...makeProps()} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.getByTestId("TokenPriceChart")).toBeInTheDocument();
      // The About card ships behind the same flag.
      expect(screen.getByTestId("AssetAbout")).toBeInTheDocument();
    });

    it("titles XLM's SAC 'Stellar Lumens' when it arrives as a contract balance", async () => {
      // Contract balances canonicalize `symbol:contractId`, so the native SAC
      // reaches this view as `XLM:C…` with NO native token type. A check on
      // the balance shape titles it "XLM" while About says "Native".
      const sac = Asset.native().contractId(
        MAINNET_NETWORK_DETAILS.networkPassphrase,
      );
      const props = {
        ...makeProps(),
        accountBalances: {
          balances: [
            {
              token: { code: "XLM", issuer: { key: sac } },
              contractId: sac,
              total: new BigNumber(10),
              available: new BigNumber(10),
              decimals: 7,
              name: "Stellar Lumens",
              symbol: "XLM",
            },
          ],
        } as any,
        selectedAsset: `XLM:${sac}`,
      };

      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={makeState(MAINNET_NETWORK_DETAILS, true)}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.getByText("Stellar Lumens")).toBeInTheDocument();
    });

    it("stays hidden until the flag fetch settles — the switch fails closed", async () => {
      // `use_token_price_history` defaults to true and the app renders before
      // the Experiment fetch resolves. Reading the flag bare would mount the
      // section and fire its requests during exactly the window an incident
      // response is trying to stop them.
      const state = makeState(MAINNET_NETWORK_DETAILS, true);
      state.remoteConfig.isInitialized = false;

      render(
        <Wrapper routes={[ROUTES.account]} state={state}>
          <AssetDetail {...makeProps()} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByTestId("TokenPriceChart")).toBeNull();
      expect(screen.queryByTestId("AssetAbout")).toBeNull();
    });

    it("hides the chart section entirely off mainnet", async () => {
      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={makeState(TESTNET_NETWORK_DETAILS, true)}
        >
          <AssetDetail {...makeProps()} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByTestId("TokenPriceChart")).toBeNull();
      // Stats are mainnet-only too.
      expect(screen.queryByTestId("TokenStats")).toBeNull();
    });

    it("hides the chart section when the kill switch is off", async () => {
      render(
        <Wrapper
          routes={[ROUTES.account]}
          state={makeState(MAINNET_NETWORK_DETAILS, false)}
        >
          <AssetDetail {...makeProps()} />
        </Wrapper>,
      );

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(screen.queryByTestId("TokenPriceChart")).toBeNull();
      expect(screen.queryByTestId("AssetAbout")).toBeNull();
      expect(screen.queryByTestId("TokenStats")).toBeNull();
    });
  });

  // The detail view shows exactly one delta, in the header under the price,
  // and it follows the chart's selected timeframe. These tests drive the real
  // wiring: the chart section owns the range and the fetch, the header
  // renders what it reports.
  describe("header delta", () => {
    const HISTORY_1D = makeHistory({ points: densePoints(97) });
    // The Figma's losing day: `-$0.0602 (12.12%)`, drawn red.
    const HISTORY_1D_NEGATIVE = makeHistory({
      change: { absolute: "-0.060200", percent: "-12.12" },
      points: densePoints(97, { startPrice: 0.26, priceStep: -0.001 }),
    });
    const HISTORY_1Y = makeHistory({
      range: "1Y",
      resolutionSeconds: 86400,
      change: { absolute: "0.060200", percent: "32.12" },
      points: densePoints(122, { stepSeconds: 86400 }),
    });

    // The 24h figure the header shows today, and the 1D error fallback.
    const NATIVE_PRICE = {
      currentPrice: "0.276338",
      percentagePriceChange24h: "1.09",
    };

    const historySpy = jest.spyOn(ApiInternal, "getTokenPriceHistory");
    const statsSpy = jest.spyOn(ApiInternal, "getTokenStats");

    beforeEach(() => {
      historySpy.mockReset();
      // The stats card is not under test; resolve it empty so it renders
      // nothing instead of hanging on an unlistened background message.
      statsSpy.mockReset().mockResolvedValue({} as any);
    });

    // Restored on its own: `jest.restoreAllMocks()` would also detach the
    // describe-scoped `historySpy`/`statsSpy` from every later test.
    let rectSpy: ReturnType<typeof mockChartRect> | undefined;

    afterEach(() => {
      resetCacheWriteClaims();
      jest.useRealTimers();
      rectSpy?.mockRestore();
      rectSpy = undefined;
    });

    const makeProps = () =>
      ({
        handleClose: () => null,
        accountBalances: {
          balances: [
            {
              available: new BigNumber(10),
              token: { type: "native", code: "XLM" },
              total: new BigNumber(10),
            },
          ],
        },
        selectedAsset: "native",
        historyData: mockHistoryData,
      }) as any;

    const makeState = ({
      networkDetails = MAINNET_NETWORK_DETAILS,
      isChartEnabled = true,
      price = NATIVE_PRICE as Record<string, string> | null,
    } = {}) => ({
      auth: {
        error: null,
        applicationState: ApplicationState.PASSWORD_CREATED,
        publicKey: "G1",
        allAccounts: mockAccounts,
      },
      settings: { networkDetails },
      remoteConfig: {
        isInitialized: true,
        use_token_price_history: isChartEnabled,
      },
      cache: {
        tokenPrices: {
          [networkDetails.networkPassphrase]: {
            G1: price ? { native: price } : {},
          },
        },
      },
    });

    const renderDetail = (state: ReturnType<typeof makeState>) =>
      render(
        <Wrapper routes={[ROUTES.account]} state={state}>
          <AssetDetail {...makeProps()} />
        </Wrapper>,
      );

    const delta = () => screen.getByTestId("AssetDetail__delta");
    // Fake-timer runs cannot use `waitFor`; settle the mount fetch's promise
    // chain by hand instead.
    const flush = async () => {
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
    };

    it("shows the selected range's delta, and it is the only delta on the view", async () => {
      historySpy.mockResolvedValue(HISTORY_1D);
      renderDetail(makeState());

      await waitFor(() => expect(delta().textContent).toBe("+$0.0014 (0.86%)"));
      // The chart's three-state palette, not `getPriceDeltaColor`.
      expect(delta().className).toContain("positive");
      // The chart section draws none of its own.
      expect(screen.queryByTestId("TokenPriceChart__delta")).toBeNull();
      expect(screen.getAllByTestId("AssetDetail__delta")).toHaveLength(1);
      // One fetch for the range on screen: the header reads the state the
      // chart already fetched, and reporting the delta upward must not send
      // the section round again. Counted per range, because the deferred warm
      // pass legitimately fetches the other five behind it.
      await flush();
      expect(
        historySpy.mock.calls.filter(([{ range }]) => range === "1D"),
      ).toHaveLength(1);
    });

    it("shows the inspected point's price in the header while dragging, and spot again on release", async () => {
      // 3 evenly-spaced buckets → bucket ends 900, 1800, 2700 → viewBox x 0, 160,
      // 320 (§ getChartCoordinates), independent of `resolutionSeconds`.
      const INSPECTABLE_HISTORY = makeHistory({
        points: [
          { t: 0, p: "0.20" },
          { t: 900, p: "0.22" },
          { t: 1800, p: "0.26" },
        ],
        resolutionSeconds: 900,
        change: { absolute: "0.06", percent: "30.00" },
      });
      historySpy.mockResolvedValue(INSPECTABLE_HISTORY);
      renderDetail(
        makeState({
          price: { currentPrice: "0.30", percentagePriceChange24h: "1.09" },
        }),
      );

      await waitFor(() => expect(delta().textContent).toBe("+$0.06 (30.00%)"));

      rectSpy = mockChartRect();
      const svg = await screen.findByTestId("TokenPriceChart__svg");

      // 640px-wide element → clientX 320 is viewBox x 160 → nearest is index 1
      // (x=160) exactly.
      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$0.22",
      );
      expect(delta()).toHaveTextContent("+$0.02 (10.00%)");

      fireEvent.pointerUp(svg, { pointerType: "touch", pointerId: 1 });
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$0.30",
      );
      expect(delta()).toHaveTextContent("+$0.06 (30.00%)");
    });

    it("prints the inspected header price with the chart's sub-dollar precision, not spot's", async () => {
      const INSPECTABLE_HISTORY = makeHistory({
        points: [
          { t: 0, p: "0.2196" },
          { t: 900, p: "0.2213" },
          { t: 1800, p: "0.2267" },
        ],
        resolutionSeconds: 900,
      });
      historySpy.mockResolvedValue(INSPECTABLE_HISTORY);
      renderDetail(
        makeState({
          price: { currentPrice: "0.30", percentagePriceChange24h: "1.09" },
        }),
      );

      await waitFor(() => expect(delta()).toBeInTheDocument());

      rectSpy = mockChartRect();
      const svg = await screen.findByTestId("TokenPriceChart__svg");

      // clientX 320 → viewBox x 160 → index 1 (p: "0.2213"). The chart's
      // formatter keeps all 4 sub-dollar decimals; spot shows 2 ("$0.22").
      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$0.2213",
      );

      fireEvent.pointerUp(svg, { pointerType: "touch", pointerId: 1 });
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$0.30",
      );
    });

    it("prints an inspected price at a dollar and above in the same two decimals as spot", async () => {
      const INSPECTABLE_HISTORY = makeHistory({
        points: [
          { t: 0, p: "1.20" },
          { t: 900, p: "1.235" },
          { t: 1800, p: "1.30" },
        ],
        resolutionSeconds: 900,
      });
      historySpy.mockResolvedValue(INSPECTABLE_HISTORY);
      renderDetail(
        makeState({
          price: { currentPrice: "1.50", percentagePriceChange24h: "1.09" },
        }),
      );

      await waitFor(() => expect(delta()).toBeInTheDocument());

      rectSpy = mockChartRect();
      const svg = await screen.findByTestId("TokenPriceChart__svg");

      // 1.235 → "$1.24": at a dollar and above the chart's formatter is the
      // standard fiat format, same as spot.
      fireEvent.pointerDown(svg, {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$1.24",
      );
    });

    it("falls back to spot when the chart unmounts mid-drag", async () => {
      // The kill switch flips (or the token/network changes) while a finger is
      // still down. The chart section unmounts without ever reporting the
      // release, so the header has to drop the inspected price on its own —
      // otherwise the view is left showing a price that is not spot and a
      // delta describing a chart that is gone.
      const INSPECTABLE_HISTORY = makeHistory({
        points: [
          { t: 0, p: "0.20" },
          { t: 900, p: "0.22" },
          { t: 1800, p: "0.26" },
        ],
        resolutionSeconds: 900,
        change: { absolute: "0.06", percent: "30.00" },
      });
      historySpy.mockResolvedValue(INSPECTABLE_HISTORY);
      const price = { currentPrice: "0.30", percentagePriceChange24h: "1.09" };
      const { rerender } = renderDetail(makeState({ price }));

      await waitFor(() => expect(delta().textContent).toBe("+$0.06 (30.00%)"));

      rectSpy = mockChartRect();
      fireEvent.pointerDown(await screen.findByTestId("TokenPriceChart__svg"), {
        pointerType: "touch",
        clientX: 320,
        pointerId: 1,
      });
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$0.22",
      );

      // No pointerup: the section goes away underneath the drag.
      rerender(
        <Wrapper
          routes={[ROUTES.account]}
          state={makeState({ isChartEnabled: false, price })}
        >
          <AssetDetail {...makeProps()} />
        </Wrapper>,
      );

      await waitFor(() =>
        expect(screen.queryByTestId("TokenPriceChart")).toBeNull(),
      );
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$0.30",
      );
      // And the range delta is gone with it — the 24h figure is what this
      // view shows without a chart.
      expect(delta().textContent).toBe("1.09%");
    });

    it("paints a losing range red — header delta and chart artwork", async () => {
      historySpy.mockResolvedValue(HISTORY_1D_NEGATIVE);
      renderDetail(makeState());

      await waitFor(() =>
        expect(delta().textContent).toBe("-$0.0602 (12.12%)"),
      );
      // The chart's three-state palette, not `getPriceDeltaColor`: a falling
      // range is negative here, and the header's `--range` styling paints
      // that red rather than the legacy branch's grey.
      expect(delta().className).toContain("AssetDetail__delta--range");
      expect(delta().className).toContain("negative");
      // ...and the chart under it is red too, not green.
      expect(screen.getByTestId("TokenPriceChart__svg")).toHaveClass(
        "LineChart--negative",
      );
    });

    it("follows the selected timeframe — 1D to 1Y", async () => {
      historySpy.mockImplementation(({ range }) =>
        Promise.resolve(range === "1Y" ? HISTORY_1Y : HISTORY_1D),
      );
      renderDetail(makeState());

      await waitFor(() => expect(delta().textContent).toBe("+$0.0014 (0.86%)"));

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: "1Y" }));

      await waitFor(
        () => expect(delta().textContent).toBe("+$0.0602 (32.12%)"),
        { timeout: 3000 },
      );
      // The spot price is live, not per-timeframe.
      expect(screen.getByText("$0.28")).toBeInTheDocument();
    });

    it("shows the placeholder for an uncached range, never the previous number", async () => {
      jest.useFakeTimers();
      historySpy.mockImplementation(({ range }) =>
        range === "1Y" ? new Promise(() => {}) : Promise.resolve(HISTORY_1D),
      );
      renderDetail(makeState());
      await flush();
      expect(delta().textContent).toBe("+$0.0014 (0.86%)");

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(screen.getByRole("tab", { name: "1Y" }));

      // Not one timer advanced: the switch flips the header to the skeleton
      // pill immediately, rather than leaving 1D's number under the 1Y tab.
      expect(delta().textContent).toBe("");
      expect(delta().querySelector(".AssetDetail__delta-ghost")).not.toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(RANGE_SWITCH_DEBOUNCE_MS + 50);
        await Promise.resolve();
      });
      expect(delta().textContent).toBe("");
    });

    it("draws the loading delta as the frame's 152 × 20 shimmer pill", async () => {
      jest.useFakeTimers();
      historySpy.mockImplementation(({ range }) =>
        range === "1Y" ? new Promise(() => {}) : Promise.resolve(HISTORY_1D),
      );
      renderDetail(makeState());
      await flush();
      expect(delta().textContent).toBe("+$0.0014 (0.86%)");

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(screen.getByRole("tab", { name: "1Y" }));

      const pill = document.querySelector(
        ".AssetDetail__delta-ghost",
      ) as HTMLElement;
      expect(pill).not.toBeNull();
      expect(pill).toHaveClass("Shimmer", "Shimmer--pill");
      expect(pill).toHaveAttribute("aria-hidden", "true");
      expect(pill.style.width).toBe("9.5rem");
      expect(pill.style.height).toBe("1.25rem");
    });

    it("shows no delta text when the range carries no change", async () => {
      historySpy.mockResolvedValue(
        makeHistory({ points: densePoints(97), change: null }),
      );
      renderDetail(makeState());

      // No number, no placeholder — and the row is still there holding its
      // line, so withholding a delta cannot move the chart below it.
      await waitFor(() =>
        expect(delta().querySelector(".AssetDetail__delta-ghost")).toBeNull(),
      );
      expect(screen.getByTestId("TokenPriceChart__polyline")).toBeDefined();
      expect(delta().textContent).toBe("");
      expect(delta().className).toContain("AssetDetail__delta--range");
    });

    it("falls back to the 24h percentage when 1D fails", async () => {
      historySpy.mockRejectedValue(new Error("backend down"));
      renderDetail(makeState());

      await waitFor(() => expect(delta().textContent).toBe("+1.09%"));
      // Percent only: the absolute is never derived from a percentage.
      expect(delta().textContent).not.toContain("$");
    });

    it("shows no number when a range other than 1D fails", async () => {
      historySpy.mockImplementation(({ range }) =>
        range === "1D"
          ? Promise.resolve(HISTORY_1D)
          : Promise.reject(new Error("backend down")),
      );
      renderDetail(makeState());

      await waitFor(() => expect(delta().textContent).toBe("+$0.0014 (0.86%)"));

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: "1Y" }));

      // A 24h figure under a 1Y selector is the wrong timeframe, so the
      // delta renders empty — the row keeps its reserved height, but carries
      // no text and no error copy.
      await waitFor(() => expect(delta().textContent).toBe(""), {
        timeout: 3000,
      });
      expect(delta().textContent).not.toContain("1.09");
    });

    describe("with the chart not rendered", () => {
      // The regression surface: off the chart path the header delta is the
      // 24h percentage it has always been, `getPriceDeltaColor` and all.
      it("keeps today's 24h delta off mainnet", async () => {
        renderDetail(makeState({ networkDetails: TESTNET_NETWORK_DETAILS }));

        await waitFor(() => screen.getByTestId("AssetDetail"));
        expect(screen.queryByTestId("TokenPriceChart")).toBeNull();
        expect(delta().textContent).toBe("1.09%");
        expect(delta().className).toContain("positive");
        expect(delta().className).not.toContain("AssetDetail__delta--range");
        expect(delta().querySelector(".AssetDetail__delta-ghost")).toBeNull();
        // Nothing fetches price history off the chart path — not the selected
        // range and not the deferred warm pass, which lives inside the gated
        // section and so cannot run on a network with no chart.
        expect(historySpy).not.toHaveBeenCalled();
      });

      it("keeps today's 24h delta with the flag off", async () => {
        renderDetail(makeState({ isChartEnabled: false }));

        await waitFor(() => screen.getByTestId("AssetDetail"));
        expect(screen.queryByTestId("TokenPriceChart")).toBeNull();
        expect(delta().textContent).toBe("1.09%");
        // Flag off: no fetch and no warm pass either.
        expect(historySpy).not.toHaveBeenCalled();
      });

      it("keeps `getPriceDeltaColor`'s zero mapping untouched", async () => {
        // `getPriceDeltaColor` paints a flat zero "negative" — a documented
        // bug that other surfaces share. Only the chart path is allowed to
        // stop going through it, so pin the old behavior here.
        renderDetail(
          makeState({
            isChartEnabled: false,
            price: { currentPrice: "0.276338", percentagePriceChange24h: "0" },
          }),
        );

        await waitFor(() => screen.getByTestId("AssetDetail"));
        expect(delta().textContent).toBe("0.00%");
        expect(delta().className).toContain("negative");
      });

      it("renders no delta row at all when the token has no 24h figure", async () => {
        renderDetail(makeState({ isChartEnabled: false, price: null }));

        await waitFor(() => screen.getByTestId("AssetDetail"));
        expect(screen.queryByTestId("AssetDetail__delta")).toBeNull();
      });
    });
  });
});

describe("AssetDetail history loading state", () => {
  const makeProps = (
    hasHistoryError?: boolean,
    historyData: AccountHistoryData | null = null,
  ) => ({
    handleClose: () => null,
    accountBalances: {
      balances: [
        {
          available: new BigNumber(10),
          token: { type: "native", code: "XLM" },
          total: new BigNumber(10),
        },
      ],
    } as any,
    selectedAsset: "native",
    historyData,
    hasHistoryError,
  });

  const renderDetail = (props: ReturnType<typeof makeProps>) =>
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <AssetDetail {...props} />
      </Wrapper>,
    );

  it("shows three skeleton rows and announces loading while history is in flight", async () => {
    renderDetail(makeProps());

    await waitFor(() => screen.getByTestId("AssetDetail__list__loader"));
    const loader = screen.getByTestId("AssetDetail__list__loader");
    expect(loader).toHaveAttribute("role", "status");
    expect(loader).toHaveAttribute("aria-label", "Loading history");
    const rows = screen.getAllByTestId("AssetDetail__list__skeleton-row");
    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      expect(row).toHaveClass("Shimmer", "Shimmer--pill");
      expect((row as HTMLElement).style.width).toBe("100%");
      expect((row as HTMLElement).style.height).toBe("2.75rem");
    });
  });

  it("shows an error, not a skeleton that never ends, when the history fetch failed", async () => {
    renderDetail(makeProps(true));

    await waitFor(() => screen.getByTestId("AssetDetail"));
    expect(screen.queryByTestId("AssetDetail__list__loader")).toBeNull();
    expect(
      screen.queryAllByTestId("AssetDetail__list__skeleton-row"),
    ).toHaveLength(0);
    expect(screen.getByTestId("AssetDetail__list__error")).toHaveTextContent(
      "Unable to load history",
    );
  });

  it("shows the empty state when history loaded but has nothing for this asset", async () => {
    renderDetail(
      makeProps(undefined, {
        type: AppDataType.RESOLVED,
        operationsByAsset: {},
      }),
    );

    await waitFor(() => screen.getByTestId("AssetDetail"));
    expect(screen.queryByTestId("AssetDetail__list__loader")).toBeNull();
    expect(screen.getByText("No transactions to show")).toBeInTheDocument();
  });
});
