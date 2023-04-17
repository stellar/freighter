import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";

import { createMemoryHistory } from "history";
import { Wrapper } from "../../__testHelpers__";
import { Account } from "../Account";
import { ROUTES } from "popup/constants/routes";

const mockHistoryGetter = jest.fn();

const mockBalances = {
  balances: {
    ["USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
      token: {
        code: "USDC",
        issuer: {
          key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        },
      },
      // ALEC TODO - why dont need BigNumber here?
      total: "100",
    },
    native: { token: { type: "native", code: "XLM", total: "50" } },
  },
  isFunded: true,
  subentryCount: 1,
};

jest.spyOn(ApiInternal, "getAccountBalances").mockImplementation(() => {
  return mockBalances;
});

console.log({ screen }); // ALEC TODO - remove

describe("Account", () => {
  it("renders", async () => {
    // ALEC TODO - remove the history stuff
    // ALEC TODO - what are these doing?
    const history = createMemoryHistory();
    history.push(ROUTES.account);
    mockHistoryGetter.mockReturnValue(history);

    render(
      <Wrapper
        // ALEC TODO - need history here?
        history={history}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G123",
            allAccounts: ["G123"],
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
});

// ALEC TODO - need to separate "describes" here?
describe("Account", () => {
  it("loads accounts", async () => {
    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G123",
            allAccounts: [
              {
                hardwareWalletType: "",
                imported: false,
                name: "Account 1",
                publicKey: "G1",
              },
              {
                hardwareWalletType: "",
                imported: true,
                name: "Account 2",
                publicKey: "G2",
              },
              {
                hardwareWalletType: "Ledger",
                imported: true,
                name: "Ledger 1",
                publicKey: "L1",
              },
            ],
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
    expect(screen.getByText("Account 1")).toBeDefined();
  });
});

describe("Account", () => {
  it("displays balances", async () => {
    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G123",
            allAccounts: ["G123"],
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
    let assetNodes;
    await waitFor(() => {
      assetNodes = screen.getAllByTestId("account-assets");
    });
    expect(assetNodes.length).toEqual(2);
    expect(screen.getAllByText("USDC")).toBeDefined();
  });
});
