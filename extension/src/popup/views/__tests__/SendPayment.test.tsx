import React from "react";
import { render, waitFor, fireEvent, screen } from "@testing-library/react";

import { Wrapper, mockBalances, mockAccounts } from "../../__testHelpers__";
import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { createMemoryHistory } from "history";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { SendPayment } from "popup/views/SendPayment";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";

jest.spyOn(ApiInternal, "getAccountIndexerBalances").mockImplementation(() => {
  return Promise.resolve(mockBalances);
});

jest.spyOn(ApiInternal, "signFreighterTransaction").mockImplementation(() => {
  return Promise.resolve({
    signedTransaction:
      "AAAAAgAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAAAAAAAAAvrwgAAAAAAAAAABHUtNEwAAAEBY/jSiXJNsA2NpiXrOi6Ll6RiIY7v8QZEEZviM8HmmzeI4FBP9wGZm7YMorQue+DK9KI5BEXDt3hi0VOA9gD8A",
  });
});

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => {
  return {
    recommendedFee: ".00001",
    networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
  };
});

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Networks: original.Networks,
    Horizon: {
      Server: class {
        loadAccount() {
          return {
            sequenceNumber: () => 1,
            accountId: () => publicKey,
            incrementSequenceNumber: () => {},
          };
        }
      },
    },
    SorobanRpc: original.SorobanRpc,
  };
});

jest.mock("react-router-dom", () => {
  const ReactRouter = jest.requireActual("react-router-dom");
  return {
    ...ReactRouter,
    Redirect: ({ to }: any) => <div>redirect {to}</div>,
  };
});
const mockHistoryGetter = jest.fn();
jest.mock("popup/constants/history", () => ({
  get history() {
    return mockHistoryGetter();
  },
}));

const publicKey = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";

describe.skip("SendPayment", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    const history = createMemoryHistory();
    history.push(ROUTES.sendPaymentTo);
    mockHistoryGetter.mockReturnValue(history);
    render(
      <Wrapper
        history={history}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <SendPayment />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("send-to-view")).toBeDefined();
    });
  });

  it("sending native asset works", async () => {
    await testPaymentFlow("native");
  });

  it("sending non-native asset works", async () => {
    await testPaymentFlow(
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
    );
  });
});

const testPaymentFlow = async (asset: string) => {
  const history = createMemoryHistory();
  history.push(ROUTES.sendPaymentTo);
  mockHistoryGetter.mockReturnValue(history);
  render(
    <Wrapper
      history={history}
      state={{
        auth: {
          error: null,
          hasPrivateKey: true,
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey,
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset,
          },
          accountBalances: mockBalances,
        },
      }}
    >
      <SendPayment />
    </Wrapper>,
  );

  await waitFor(() => {
    const input = screen.getByTestId("send-to-input");
    fireEvent.change(input, { target: { value: publicKey } });
  });

  await waitFor(
    async () => {
      const continueBtn = screen.getByTestId("send-to-btn-continue");
      await fireEvent.click(continueBtn);
    },
    { timeout: 3000 },
  );

  await waitFor(async () => {
    const input = screen.getByTestId("send-amount-amount-input");
    fireEvent.change(input, { target: { value: "5" } });
  });

  await waitFor(async () => {
    const continueBtn = screen.getByTestId("send-amount-btn-continue");
    expect(continueBtn).not.toBeDisabled();
    await fireEvent.click(continueBtn);
  });

  await waitFor(async () => {
    const continueBtn = screen.getByTestId("send-settings-btn-continue");
    await fireEvent.click(continueBtn);
  });

  await waitFor(async () => {
    const sendBtn = screen.getByTestId("transaction-details-btn-send");
    await fireEvent.click(sendBtn);
  });
};
