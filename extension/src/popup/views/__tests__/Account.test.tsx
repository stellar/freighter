import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { Horizon } from "stellar-sdk";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";
import * as UseAssetDomain from "popup/helpers/useAssetDomain";

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

jest.spyOn(global, "fetch").mockImplementation(() =>
  Promise.resolve({
    json: async () => {
      return [];
    },
  } as any),
);

jest
  .spyOn(ApiInternal, "getAccountIndexerBalances")
  .mockImplementation(() => Promise.resolve(mockBalances));

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
  .spyOn(ApiInternal, "getIndexerAccountHistory")
  .mockImplementation(() => Promise.resolve(mockHistoryOperations.operations));

jest.spyOn(UseAssetDomain, "useAssetDomain").mockImplementation(() => {
  return { assetDomain: "centre.io", error: "" };
});

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
  it("displays balances", async () => {
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
      const assetNodes = screen.getAllByTestId("account-assets");
      expect(assetNodes.length).toEqual(3);
      expect(screen.getAllByText("USDC")).toBeDefined();
    });
  });
  it.skip("goes to account details", async () => {
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
      const assetNodes = screen.getAllByTestId("account-assets");
      await fireEvent.click(assetNodes[1]);
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("asset-detail-available-copy"),
      ).toHaveTextContent("100 USDC");
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
});
