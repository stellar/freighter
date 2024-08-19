import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory } from "history";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";

import { Wrapper, mockBalances, mockAccounts } from "../../__testHelpers__";
import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { SendPayment } from "popup/views/SendPayment";
import * as transactionSubmission from "popup/ducks/transactionSubmission";
import * as tokenPaymentActions from "popup/ducks/token-payment";
import * as accountHelpers from "background/helpers/account";

const publicKey = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";

jest.spyOn(ApiInternal, "getAccountIndexerBalances").mockImplementation(() => {
  return Promise.resolve(mockBalances);
});

jest
  .spyOn(ApiInternal, "signFreighterSorobanTransaction")
  .mockImplementation(() => {
    return Promise.resolve({
      signedTransaction:
        "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrAAAAGQAALDTAAAAmQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAACAAAAEgAAAAGvUaDMj6075hfTiVH7DPAwLD7vh/GD+dlkZfp6o9gqdgAAAA8AAAAGc3ltYm9sAAAAAAAAAAAAAAAAAAA=",
    });
  });

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => {
  return {
    recommendedFee: ".00001",
    networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
  };
});

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => {
  return {
    recommendedFee: ".00001",
    networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
  };
});

jest.spyOn(accountHelpers, "getNetworkDetails").mockImplementation(() => {
  return {
    networkUrl: "testnet",
    networkPassphrase: "passphrase",
  } as any;
});

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Address: original.Address,
    Asset: original.Asset,
    Contract: original.Contract,
    Networks: original.Networks,
    StrKey: original.StrKey,
    Horizon: original.Horizon,
    SorobanRpc: {
      ...original.SorobanRpc,
      assembleTransaction: (tx: any, _sim: any) => {
        return new original.TransactionBuilder.cloneFrom(tx);
      },
      Horizon: {
        Server: class {
          getAccount(address: string) {
            return Promise.resolve(new original.Account(address, "0"));
          }
          simulateTransaction = async (_tx: any) => {
            return Promise.resolve({
              transactionData: {},
              cost: {
                cpuInsns: 12389,
                memBytes: 32478,
              },
              minResourceFee: 43289,
            });
          };
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
      },
    },
    TransactionBuilder: original.TransactionBuilder,
    XdrLargeInt: original.XdrLargeInt,
  };
});

jest.mock("react-router-dom", () => {
  const ReactRouter = jest.requireActual("react-router-dom");
  return {
    ...ReactRouter,
    Redirect: ({ to }: any) => <div>redirect {to}</div>,
  };
});
jest.mock("helpers/metrics", () => {
  return {
    registerHandler: () => ({}),
    uploadMetrics: () => ({}),
    emitMetric: (_name: string, _body?: any) => ({}),
  };
});
const mockHistoryGetter = jest.fn();
jest.mock("popup/constants/history", () => ({
  get history() {
    return mockHistoryGetter();
  },
}));

jest.spyOn(global, "fetch").mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({
      id: "tx ID",
      transactionData: {},
      cost: {
        cpuInsns: 12389,
        memBytes: 32478,
      },
      minResourceFee: 43289,
    }),
  } as any),
);

jest.mock("popup/helpers/searchAsset", () => {
  return {
    getVerifiedTokens: async () => Promise.resolve([]),
  };
});

describe("SendTokenPayment", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  const history = createMemoryHistory();
  history.push(ROUTES.sendPaymentTo);
  mockHistoryGetter.mockReturnValue(history);

  const asset = "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";
  const { container } = render(
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
          ...transactionSubmission.initialState,
          transactionData: {
            ...transactionSubmission.initialState.transactionData,
            asset,
            isToken: true,
          },
          transactionSimulation: {
            raw: null,
            response: null,
          },
          accountBalances: mockBalances,
        },
        tokenPaymentSimulation: tokenPaymentActions.initialState,
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
      const continueBtn = screen.getByTestId("send-settings-btn-continue");
      expect(continueBtn).not.toBeDisabled();
      await fireEvent.click(continueBtn);
    });

    await waitFor(async () => {
      expect(container).toHaveTextContent("5 DT");
      const sendBtn = screen.getByTestId("transaction-details-btn-send");
      await fireEvent.click(sendBtn);
    });
  });
});
