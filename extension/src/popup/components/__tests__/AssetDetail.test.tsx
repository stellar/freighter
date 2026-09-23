import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
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

  describe("Hide asset", () => {
    const renderDetail = (props: any) =>
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
            settings: { networkDetails: TESTNET_NETWORK_DETAILS },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

    const classicAsset = {
      handleClose: () => null,
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: {
              code: "USDC",
              issuer: {
                key: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
              },
            },
            total: new BigNumber(10),
          },
        ],
      } as any,
      assetOperations: [] as any,
      selectedAsset:
        "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      setSelectedAsset: () => null,
      historyData: mockHistoryData,
    };

    it("offers Hide for a classic asset", async () => {
      renderDetail(classicAsset);

      fireEvent.click(await screen.findByAltText("asset options"));
      await waitFor(() =>
        expect(screen.getByTestId("asset-detail-hide-button")).toBeVisible(),
      );
      // Translations resolve to empty strings under test, so the label falls
      // back to the raw key; the interpolated code is not observable here.
      expect(screen.getByTestId("asset-detail-hide-button")).toHaveTextContent(
        "Hide",
      );
    });

    it("does not offer Hide for native XLM", async () => {
      // filterHiddenBalances never hides native, so offering it would be a
      // no-op the user could not undo.
      renderDetail({
        ...classicAsset,
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
      });

      fireEvent.click(await screen.findByAltText("asset options"));
      await screen.findByText("Stellar.expert");
      expect(
        screen.queryByTestId("asset-detail-hide-button"),
      ).not.toBeInTheDocument();
    });

    it("hides the asset and closes the sheet", async () => {
      const changeAssetVisibility = jest
        .spyOn(ApiInternal, "changeAssetVisibility")
        .mockResolvedValue({
          hiddenAssets: {
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN":
              "hidden",
          },
          error: "",
        } as any);
      const handleClose = jest.fn();

      renderDetail({ ...classicAsset, handleClose });

      fireEvent.click(await screen.findByAltText("asset options"));
      fireEvent.click(await screen.findByTestId("asset-detail-hide-button"));

      await waitFor(() =>
        expect(changeAssetVisibility).toHaveBeenCalledWith({
          assetKey:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          assetVisibility: "hidden",
          activePublicKey: "G1",
        }),
      );
      // The row is gone from the list behind the sheet, so there is nothing
      // left to return to.
      await waitFor(() => expect(handleClose).toHaveBeenCalled());

      changeAssetVisibility.mockRestore();
    });
  });

  describe("Remove asset", () => {
    const renderDetail = (props: any) =>
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
            settings: { networkDetails: TESTNET_NETWORK_DETAILS },
          }}
        >
          <AssetDetail {...props} />
        </Wrapper>,
      );

    const classicProps = {
      handleClose: () => null,
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: {
              code: "USDC",
              issuer: {
                key: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
              },
            },
            total: new BigNumber(10),
          },
        ],
      } as any,
      assetOperations: [] as any,
      selectedAsset:
        "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      setSelectedAsset: () => null,
      historyData: mockHistoryData,
    };

    it("offers Remove for a classic asset", async () => {
      renderDetail(classicProps);

      fireEvent.click(await screen.findByAltText("asset options"));
      await waitFor(() =>
        expect(screen.getByTestId("asset-detail-remove-button")).toBeVisible(),
      );
    });

    it("does not offer Remove for native XLM", async () => {
      // Native has no trustline to close, so a changeTrust could not succeed.
      renderDetail({
        ...classicProps,
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
      });

      fireEvent.click(await screen.findByAltText("asset options"));
      // Stellar.expert is present for native on testnet, so this waits for the
      // menu to actually be open before asserting Remove is absent from it.
      await screen.findByText("Stellar.expert");
      expect(
        screen.queryByTestId("asset-detail-remove-button"),
      ).not.toBeInTheDocument();
    });

    it("does not offer Remove for a liquidity pool share", async () => {
      // LP shares are exited by withdrawing from the pool, not by closing a
      // trustline. The canonical carries the ":lp" issuer marker.
      const liquidityPoolId =
        "67260c4c1807b262ff851b0a3fe141194936bb0215b2f77447f1df11998eabb9";
      renderDetail({
        ...classicProps,
        accountBalances: {
          balances: [
            {
              liquidityPoolId,
              total: new BigNumber(100),
              available: new BigNumber(100),
              limit: "1000",
              reserves: [
                { asset: "XLM:native", amount: "1000" },
                {
                  asset:
                    "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
                  amount: "1000",
                },
              ],
            },
          ],
        } as any,
        selectedAsset: `${liquidityPoolId}:lp`,
      });

      fireEvent.click(await screen.findByAltText("asset options"));
      await screen.findByText("Stellar.expert");
      expect(
        screen.queryByTestId("asset-detail-remove-button"),
      ).not.toBeInTheDocument();
    });

    // ChangeTrustInternal emits signing.rejected on unmount unless it was
    // approved, so it must not be mounted alongside the detail body -- every
    // sheet close would emit a rejection for users who never opened the flow.
    it("does not mount the remove flow until Remove is chosen", async () => {
      renderDetail(classicProps);

      await waitFor(() => screen.getByTestId("AssetDetail"));
      expect(
        screen.queryByTestId("ChangeTrustInternal"),
      ).not.toBeInTheDocument();
    });

    // A changeTrust that zeroes the limit is rejected while the trustline still
    // holds a balance, so entering the flow could only ever fail on submit.
    it("warns instead of starting the remove flow when a balance is held", async () => {
      renderDetail(classicProps);

      fireEvent.click(await screen.findByAltText("asset options"));
      fireEvent.click(await screen.findByTestId("asset-detail-remove-button"));

      const warning = await screen.findByTestId("asset-detail-balance-warning");
      // SlideupModal always renders its children; open state is the class.
      await waitFor(() =>
        expect(warning.closest(".SlideupModal")).toHaveClass("open"),
      );
      expect(
        screen.getByTestId("asset-detail-balance-warning"),
      ).toHaveTextContent("Token still has a balance");
      // Still on the detail body, not the remove flow.
      expect(screen.getByTestId("AssetDetail")).toBeInTheDocument();
    });

    it("leaves the warning closed when the balance is zero", async () => {
      renderDetail({
        ...classicProps,
        accountBalances: {
          balances: [
            {
              available: new BigNumber(0),
              token: {
                code: "USDC",
                issuer: {
                  key: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
                },
              },
              total: new BigNumber(0),
            },
          ],
        } as any,
      });

      fireEvent.click(await screen.findByAltText("asset options"));
      const warning = screen.getByTestId("asset-detail-balance-warning");
      expect(warning.closest(".SlideupModal")).toHaveClass("closed");
    });

    // The confirm-transaction view belongs in a bottom sheet over the detail,
    // not as a full-screen takeover of it.
    it("opens the remove flow in a bottom sheet", async () => {
      renderDetail({
        ...classicProps,
        accountBalances: {
          balances: [
            {
              available: new BigNumber(0),
              token: {
                code: "USDC",
                issuer: {
                  key: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
                },
              },
              total: new BigNumber(0),
            },
          ],
        } as any,
      });

      fireEvent.click(await screen.findByAltText("asset options"));
      fireEvent.click(await screen.findByTestId("asset-detail-remove-button"));

      const flow = await screen.findByTestId("ChangeTrustInternal");
      expect(flow.closest(".SlideupModal")).toHaveClass("open");
    });
  });
});
