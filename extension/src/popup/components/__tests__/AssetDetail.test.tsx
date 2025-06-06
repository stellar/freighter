import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { AssetDetail } from "popup/components/account/AssetDetail";
import { ROUTES } from "popup/constants/routes";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import * as ApiInternal from "@shared/api/internal";
import { mockAccounts, Wrapper, mockBalances } from "popup/__testHelpers__";

describe("AssetDetail", () => {
  it("renders asset detail", async () => {
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));
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
          type: "payment",
          type_i: 1,
        },
      ] as any,
      publicKey: "G1",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      selectedAsset: "native",
      setSelectedAsset: () => null,
      setIsDetailViewShowing: () => null,
      subentryCount: 0,
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
          type: "payment",
          type_i: 1,
        },
      ] as any,
      publicKey: "G1",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      selectedAsset: "native",
      setSelectedAsset: () => null,
      setIsDetailViewShowing: () => null,
      subentryCount: 0,
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
          type: "payment",
          type_i: 1,
        },
      ] as any,
      publicKey: "G1",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      selectedAsset: "native",
      setSelectedAsset: () => null,
      setIsDetailViewShowing: () => null,
      subentryCount: 0,
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
      } as any,
      assetOperations: [] as any,
      publicKey: "G1",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      selectedAsset:
        "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      setSelectedAsset: () => null,
      setIsDetailViewShowing: () => null,
      subentryCount: 0,
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
    await waitFor(() => screen.getByTestId("asset-detail-available-copy"));
    expect(screen.getByTestId("asset-detail-available-copy")).toHaveTextContent(
      "100 BAZ",
    );
  });
  it("should display Send and Swap buttons", async () => {
    const props = {
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
            blockAidData: {
              result_type: "Benign",
            },
            total: new BigNumber(100),
          },
        ],
      } as any,
      assetOperations: [] as any,
      publicKey: "G1",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      selectedAsset:
        "BAZ:GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      setSelectedAsset: () => null,
      setIsDetailViewShowing: () => null,
      subentryCount: 0,
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
    await waitFor(() => screen.getByTestId("asset-detail-available-copy"));
    expect(screen.getByTestId("asset-detail-send-button")).toBeVisible();
    expect(screen.getByTestId("asset-detail-swap-button")).toBeVisible();
  });
  it("should not display Swap buttons for Soroban custom tokens", async () => {
    const props = {
      accountBalances: {
        balances: [
          {
            available: new BigNumber(10),
            token: { type: "native", code: "XLM" },
            total: new BigNumber(10),
          },
          {
            available: new BigNumber(0),
            contractId:
              "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
            token: {
              type: "credit_alphanum12",
              code: "BAZ",
              issuer: {
                key: "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
              },
            },
            blockAidData: {
              result_type: "Benign",
            },
            total: new BigNumber(100),
          },
        ],
      } as any,
      assetOperations: [] as any,
      publicKey: "G1",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      selectedAsset:
        "BAZ:CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
      setSelectedAsset: () => null,
      setIsDetailViewShowing: () => null,
      subentryCount: 0,
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
    await waitFor(() => screen.getByTestId("asset-detail-available-copy"));
    expect(screen.queryByText("SWAP")).toBeNull();
  });
});
