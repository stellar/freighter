import React from "react";
import { render, waitFor, fireEvent, screen } from "@testing-library/react";

import { Wrapper, mockBalances, mockAccounts } from "../../__testHelpers__";
import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as BlockaidHelpers from "popup/helpers/blockaid";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { createMemoryHistory } from "history";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { SendPayment } from "popup/views/SendPayment";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import * as CheckSuspiciousAsset from "popup/helpers/checkForSuspiciousAsset";
import * as tokenPaymentActions from "popup/ducks/token-payment";

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

jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
  return {
    scanTx: () => Promise.resolve(null),
    isLoading: false,
    setLoading: () => {},
    data: null,
    error: null,
  };
});

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Asset: original.Asset,
    StrKey: original.StrKey,
    Networks: original.Networks,
    Operation: original.Operation,
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
    TransactionBuilder: original.TransactionBuilder,
  };
});

jest
  .spyOn(CheckSuspiciousAsset, "checkForSuspiciousAsset")
  .mockImplementation(({ issuer }: { issuer: string }) => {
    let isRevocable = false;
    let isNewAsset = false;
    let isInvalidDomain = false;

    if (issuer === "GBFJZSHWOMYS6U73NXQRRD4JX6TZNWEAFII6Z5INGWVJ2VCQ2K4NQMHP") {
      isRevocable = true;
      isNewAsset = true;
      isInvalidDomain = true;
    }

    return Promise.resolve({ isRevocable, isNewAsset, isInvalidDomain });
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

describe("SendPayment", () => {
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
          tokenPaymentSimulation: tokenPaymentActions.initialState,
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
          assetDomains: {
            "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM":
              "domain.com",
          },
        },
        tokenPaymentSimulation: tokenPaymentActions.initialState,
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
    if (
      asset === "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"
    ) {
      expect(screen.getByTestId("ScamAssetIcon")).toBeDefined();
    } else {
      expect(screen.queryByTestId("ScamAssetIcon")).toBeNull();
    }
    const continueBtn = screen.getByTestId("send-amount-btn-continue");
    expect(continueBtn).not.toBeDisabled();
    await fireEvent.click(continueBtn);

    if (
      asset === "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"
    ) {
      await fireEvent.click(screen.getByTestId("ScamAsset__send"));
    }
  });

  await waitFor(async () => {
    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Send Settings",
    );
    const continueBtn = screen.getByTestId("send-settings-btn-continue");
    expect(continueBtn).toBeEnabled();
    await fireEvent.click(continueBtn);
  });

  await waitFor(async () => {
    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Confirm Send",
    );
    if (
      asset === "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"
    ) {
      expect(screen.getByTestId("BlockaidWarningModal__button")).toBeDefined();
    } else {
      expect(screen.queryByTestId("BlockaidWarningModal__button")).toBeNull();
    }
    const sendBtn = screen.getByTestId("transaction-details-btn-send");
    await fireEvent.click(sendBtn);
  });
};
