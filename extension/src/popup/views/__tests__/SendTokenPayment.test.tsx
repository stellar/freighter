import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { createMemoryHistory } from "history";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";

import {
  Wrapper,
  mockBalances,
  mockAccounts,
  mockTokenBalance,
} from "../../__testHelpers__";
import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { SendPayment } from "popup/views/SendPayment";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";

jest.spyOn(ApiInternal, "getAccountBalances").mockImplementation(() => {
  return Promise.resolve(mockBalances);
});

jest.spyOn(ApiInternal, "getSorobanTokenBalance").mockImplementation(() => {
  return Promise.resolve(mockTokenBalance);
});

jest
  .spyOn(ApiInternal, "signFreighterSorobanTransaction")
  .mockImplementation(() => {
    return Promise.resolve({
      signedTransaction:
        "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrAAAAGQAALDTAAAAmQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAACAAAAEgAAAAGvUaDMj6075hfTiVH7DPAwLD7vh/GD+dlkZfp6o9gqdgAAAA8AAAAGc3ltYm9sAAAAAAAAAAAAAAAAAAA=",
    });
  });

jest
  .spyOn(ApiInternal, "submitFreighterSorobanTransaction")
  .mockImplementation(() => {
    return Promise.resolve({} as any);
  });

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => {
  return {
    recommendedFee: ".00001",
    networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
  };
});

jest.mock("soroban-client", () => {
  const original = jest.requireActual("soroban-client");
  return {
    ...original,
    Server: class {
      loadAccount() {
        return {
          sequenceNumber: () => 1,
          accountId: () => publicKey,
          incrementSequenceNumber: () => {},
        };
      }
    },
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

describe.skip("SendTokenPayment", () => {
  it("renders send payment view", async () => {
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

  it("can send a payment using Soroban token", async () => {
    await testPaymentFlow(
      "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
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
            isToken: true,
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
};
