import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { AssetDetail } from "popup/components/account/AssetDetail";
import { ROUTES } from "popup/constants/routes";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import * as ApiInternal from "@shared/api/internal";
import { mockAccounts, Wrapper, mockBalances } from "popup/__testHelpers__";
import { AppDataType } from "helpers/hooks/useGetAppData";

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

describe("AssetDetail", () => {
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
      subentryCount: 0,
      historyData: mockHistoryData,
      assetIcons: {
        "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
          "test-img-src",
      },
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
      subentryCount: 0,
      historyData: mockHistoryData,
      assetIcons: {
        "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
          "test-img-src",
      },
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
      subentryCount: 0,
      historyData: mockHistoryData,
      assetIcons: {
        "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
          "test-img-src",
      },
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
      subentryCount: 0,
      historyData: mockHistoryData,
      assetIcons: {
        "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
          "test-img-src",
      },
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
              G1: {
                "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF":
                  {
                    price: 1,
                    timestamp: 1718236800,
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

  describe("Action Buttons", () => {
    it("should show both send and swap buttons for native asset with balance", async () => {
      const props = {
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
        publicKey: "G1",
        networkDetails: TESTNET_NETWORK_DETAILS,
        selectedAsset: "native",
        setSelectedAsset: () => null,
        subentryCount: 0,
        historyData: mockHistoryData,
        assetIcons: {},
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
        publicKey: "G1",
        networkDetails: TESTNET_NETWORK_DETAILS,
        selectedAsset: "native",
        setSelectedAsset: () => null,
        subentryCount: 0,
        historyData: mockHistoryData,
        assetIcons: {},
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
        publicKey: "G1",
        networkDetails: TESTNET_NETWORK_DETAILS,
        selectedAsset: `USDC:${contractId}`,
        setSelectedAsset: () => null,
        subentryCount: 0,
        historyData: mockHistoryData,
        assetIcons: {},
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

    it("should show both buttons for classic asset with balance", async () => {
      const props = {
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
        publicKey: "G1",
        networkDetails: TESTNET_NETWORK_DETAILS,
        selectedAsset:
          "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        setSelectedAsset: () => null,
        subentryCount: 0,
        historyData: mockHistoryData,
        assetIcons: {},
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
        publicKey: "G1",
        networkDetails: TESTNET_NETWORK_DETAILS,
        selectedAsset: `${liquidityPoolId}:lp`,
        setSelectedAsset: () => null,
        subentryCount: 0,
        historyData: mockHistoryData,
        assetIcons: {},
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
        publicKey: "G1",
        networkDetails: TESTNET_NETWORK_DETAILS,
        selectedAsset: `${liquidityPoolId}:lp`,
        setSelectedAsset: () => null,
        subentryCount: 0,
        historyData: mockHistoryData,
        assetIcons: {},
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
      expect(screen.queryByTestId("asset-detail-send-button")).toBeNull();
    });
  });
});
