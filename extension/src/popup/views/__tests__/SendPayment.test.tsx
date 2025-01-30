import React from "react";
import { render, waitFor, fireEvent, screen } from "@testing-library/react";

import {
  Wrapper,
  mockBalances,
  mockTestnetBalances,
  mockAccounts,
} from "../../__testHelpers__";
import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as BlockaidHelpers from "popup/helpers/blockaid";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";

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
  const setLoading = () => {};
  return {
    scanTx: () => Promise.resolve(null),
    setLoading,
    isLoading: false,
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

const publicKey = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";

describe("SendPayment", () => {
  beforeEach(() => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
      return {
        scanTx: () => Promise.resolve(null),
        isLoading: false,
        data: null,
        error: null,
        setLoading: () => {},
      };
    });
  });
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPaymentTo]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
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

  it("sending native asset on Mainnet works", async () => {
    await testPaymentFlow("native", true, false);
  });

  it("sending non-native asset on Mainnet with Blockaid validation and asset warnings", async () => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
      const scanTxResult = {
        simulation: {
          status: "Success",
        } as any,
        validation: {
          classification: "",
          features: [
            {
              feature_id: "KNOWN_MALICIOUS",
              type: "Malicious",
              address: "baz",
              description: "foo",
            },
          ] as any,
          description: "foo",
          reason: "",
          result_type: "Malicious" as any,
          status: "Success" as any,
        },
      };
      return {
        scanTx: () => Promise.resolve(null),
        isLoading: false,
        data: scanTxResult,
        error: null,
        setLoading: () => {},
      };
    });
    await testPaymentFlow(
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      true,
      false,
    );
  });

  it("sending non-native asset on Mainnet with Blockaid simulation error", async () => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
      const scanTxResult = {
        simulation: {
          error: "Sim failed",
        } as any,
        validation: {
          classification: "",
          features: [
            {
              feature_id: "KNOWN_MALICIOUS",
              type: "Malicious",
              address: "baz",
              description: "foo",
            },
          ] as any,
          description: "foo",
          reason: "",
          result_type: "Malicious" as any,
          status: "Success" as any,
        },
      };
      return {
        scanTx: () => Promise.resolve(null),
        isLoading: false,
        data: scanTxResult,
        error: null,
        setLoading: () => {},
      };
    });
    await testPaymentFlow(
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      true,
      true,
    );
  });

  it("sending native asset on Testnet works", async () => {
    await testPaymentFlow("native", false, false);
  });

  it("sending non-native asset on Testnet works", async () => {
    await testPaymentFlow(
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      false,
      false,
    );
  });
});

const testPaymentFlow = async (
  asset: string,
  isMainnet: boolean,
  hasSimError: boolean,
) => {
  render(
    <Wrapper
      routes={[ROUTES.sendPaymentTo]}
      state={{
        auth: {
          error: null,
          hasPrivateKey: true,
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey,
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: isMainnet
            ? MAINNET_NETWORK_DETAILS
            : TESTNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset,
          },
          accountBalances: isMainnet ? mockBalances : mockTestnetBalances,
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
      asset ===
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM" &&
      isMainnet
    ) {
      expect(screen.getByTestId("ScamAssetIcon")).toBeDefined();
    } else {
      expect(screen.queryByTestId("ScamAssetIcon")).toBeNull();
    }

    const continueBtn = screen.getByTestId("send-amount-btn-continue");
    expect(continueBtn).not.toBeDisabled();
    await fireEvent.click(continueBtn);

    if (
      asset ===
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM" &&
      isMainnet
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
      asset ===
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM" &&
      isMainnet
    ) {
      expect(
        screen.getByTestId("BlockaidWarningModal__button__asset"),
      ).toBeDefined();
      expect(
        screen.getByTestId("BlockaidWarningModal__button__tx"),
      ).toBeDefined();

      await fireEvent.click(
        screen.getByTestId("BlockaidWarningModal__button__tx"),
      );
      expect(screen.getByTestId("BlockaidWarningModal__tx")).toBeDefined();
      if (hasSimError) {
        expect(
          screen.getByTestId("BlockaidWarningModal__tx"),
        ).toHaveTextContent("Sim failed");
      } else {
        expect(
          screen.getByTestId("BlockaidWarningModal__tx"),
        ).toHaveTextContent("foo");
      }

      await fireEvent.click(screen.getByTestId("BlockaidWarningModal__button"));

      await fireEvent.click(
        screen.getByTestId("BlockaidWarningModal__button__asset"),
      );
      expect(screen.getByTestId("BlockaidWarningModal__asset")).toBeDefined();
      expect(
        screen.getByTestId("BlockaidWarningModal__asset"),
      ).toHaveTextContent("baz");
      await fireEvent.click(screen.getByTestId("BlockaidWarningModal__button"));
    } else {
      expect(
        screen.queryByTestId("BlockaidWarningModal__button__asset"),
      ).toBeNull();
      expect(
        screen.queryByTestId("BlockaidWarningModal__button__tx"),
      ).toBeNull();
    }

    const sendBtn = screen.getByTestId("transaction-details-btn-send");
    await fireEvent.click(sendBtn);
  });
};
