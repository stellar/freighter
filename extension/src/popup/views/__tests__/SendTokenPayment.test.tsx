import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  mockTokenBalances,
} from "../../__testHelpers__";
import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { SendPayment } from "popup/views/SendPayment";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { initialState as sorobanInitialState } from "popup/ducks/soroban";

jest.spyOn(ApiInternal, "getAccountBalances").mockImplementation(() => {
  return Promise.resolve(mockBalances);
});

jest.spyOn(ApiInternal, "getSorobanTokenBalance").mockImplementation(() => {
  return Promise.resolve(mockTokenBalance);
});

jest.mock("popup/ducks/soroban", () => {
  const original = jest.requireActual("popup/ducks/soroban");
  return {
    ...original,
    getTokenBalances: () => {
      return {
        type: "test-action",
        payload: mockTokenBalances,
      };
    },
  };
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
    return Promise.resolve({
      status: "PENDING",
      hash: "some-hash",
      latestLedger: 32131,
      latestLedgerCloseTime: 62131,
    });
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
      prepareTransaction(tx: any, _passphrase: string) {
        return Promise.resolve(tx as any);
      }
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

describe("SendTokenPayment", () => {
  const history = createMemoryHistory();
  history.push(ROUTES.sendPaymentTo);
  mockHistoryGetter.mockReturnValue(history);

  const asset = "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";
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
        soroban: {
          ...sorobanInitialState,
          tokenBalances: mockTokenBalances.tokenBalances,
        },
      }}
    >
      <SendPayment />
    </Wrapper>,
  );

  it("can send a payment using a Soroban token", async () => {
    await waitFor(async () => {
      const input = screen.getByTestId("send-to-input");
      await userEvent.type(input, publicKey);
    });

    await waitFor(
      async () => {
        const continueBtn = screen.getByTestId("send-to-btn-continue");
        fireEvent.click(continueBtn);
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
      screen.getByTestId("send-settings-view");
      const continueBtn = screen.getByTestId("send-settings-btn-continue");
      await fireEvent.click(continueBtn);
    });

    await waitFor(async () => {
      const sendBtn = screen.getByTestId("transaction-details-btn-send");
      await fireEvent.click(sendBtn);
    });

    await waitFor(() => screen.getByTestId("submit-success-view"));
  });
});
