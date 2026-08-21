import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ActionStatus } from "@shared/api/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Earn } from "popup/views/Earn";
import { initialState as earnInitialState } from "popup/ducks/earn";
import {
  initialState as transactionSubmissionInitialState,
  submitFreighterSorobanTransaction,
} from "popup/ducks/transactionSubmission";
import { getTestStore, Wrapper } from "popup/__testHelpers__";

const TEST_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";

// Counts mounts, which is the whole point: the deposit terminal submits from a
// mount effect, so "how many times was it mounted" is "how many times did it
// post to the network".
const mockDepositMounts = jest.fn();

// jest.mock factories are hoisted and may only reach `mock`-prefixed bindings,
// so the picker's payload lives here rather than inline in the factory.
const mockPickerSelection = {
  option: {
    code: "USDC",
    issuer: USDC_ISSUER,
    assetId: USDC_SAC,
    poolId: POOL_ID,
    apy: 0.05,
  },
  resolved: {
    pool: { id: POOL_ID },
    publicKey: TEST_PUBLIC_KEY,
    networkDetails: TESTNET_NETWORK_DETAILS,
  },
};

jest.mock("popup/components/earn/EarnIntro/hooks/useEarnIntroSeen", () => ({
  useEarnIntroSeen: () => ({ hasSeenIntro: true, dismissIntro: jest.fn() }),
}));

jest.mock("popup/components/earn/EarnIntro", () => ({
  EarnIntro: () => <div data-testid="stub-intro" />,
}));

jest.mock("popup/components/earn/EarnSwap", () => ({
  EarnSwap: () => <div data-testid="stub-swap" />,
}));

jest.mock("popup/components/earn/EarnTokenPicker", () => ({
  EarnTokenPicker: ({ onSelect }: { onSelect: Function }) => (
    <button
      data-testid="stub-pick-token"
      onClick={() =>
        onSelect(mockPickerSelection.option, mockPickerSelection.resolved)
      }
    >
      pick
    </button>
  ),
}));

jest.mock("popup/components/earn/EarnAmount", () => ({
  EarnAmount: ({ onConfirm }: { onConfirm: () => void }) => (
    <button data-testid="stub-confirm-amount" onClick={onConfirm}>
      confirm
    </button>
  ),
}));

jest.mock("popup/components/earn/EarnSubmit", () => ({
  EarnSubmit: () => {
    // Required inside the factory: hoisting puts this above the react import.
    const { useEffect } = require("react");
    useEffect(() => {
      mockDepositMounts();
    }, []);
    return <div data-testid="stub-deposit-terminal" />;
  },
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

jest.mock("popup/metrics/earn", () => ({
  ...jest.requireActual("popup/metrics/earn"),
  trackEarnDepositFailed: jest.fn(),
  trackEarnTokenSelected: jest.fn(),
  trackEarnSwapCompleted: jest.fn(),
}));

const { trackEarnDepositFailed } =
  jest.requireMock<typeof import("popup/metrics/earn")>("popup/metrics/earn");

const renderEarn = () =>
  render(
    <Wrapper
      routes={["/earn"]}
      state={{
        auth: { allAccounts: [TEST_PUBLIC_KEY], publicKey: TEST_PUBLIC_KEY },
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionSimulation: {
            response: null,
            preparedTransaction: "AAAA-prepared",
          },
        },
        earn: { ...earnInitialState, hasSeenIntro: true },
      }}
    >
      <Earn />
    </Wrapper>,
  );

/** Drive the flow to the deposit terminal the way a user does. */
const reachDepositTerminal = async () => {
  await userEvent.click(screen.getByTestId("stub-pick-token"));
  await userEvent.click(screen.getByTestId("stub-confirm-amount"));
  await waitFor(() => expect(mockDepositMounts).toHaveBeenCalledTimes(1));
};

describe("Earn deposit failure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not remount the deposit terminal after a failed submission", async () => {
    // The regression: every visited step stayed mounted, and the terminal was
    // only *blanked* while submitStatus was ERROR. Clearing that status put it
    // straight back, remounting it — and its mount effect resubmitted the same
    // rejected envelope, forever.
    renderEarn();
    await reachDepositTerminal();

    act(() => {
      getTestStore()!.dispatch(
        submitFreighterSorobanTransaction.rejected(
          null,
          "req-1",
          {
            publicKey: TEST_PUBLIC_KEY,
            signedXDR: "AAAA-prepared",
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
          { errorMessage: "tx_bad_auth" },
        ),
      );
    });

    // Back on the amount screen, and the terminal is gone rather than hidden.
    await waitFor(() =>
      expect(screen.queryByTestId("stub-deposit-terminal")).toBeNull(),
    );
    expect(mockDepositMounts).toHaveBeenCalledTimes(1);
    // Not this view's event to emit: the deposit step's own failures come from
    // useSubmitEarnTxData, whose continuation survives the user closing the
    // screen. (The terminal is stubbed here, so nothing emits at all.)
    expect(trackEarnDepositFailed).not.toHaveBeenCalled();

    // Give any loop a chance to run: the old code cycled on every state change.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockDepositMounts).toHaveBeenCalledTimes(1);
    expect(trackEarnDepositFailed).not.toHaveBeenCalled();
  });

  it("emits the failure for a rejection that never reached the terminal", async () => {
    // A device-rejected signature at the review sheet: the flow is still on the
    // amount step, so no submit hook exists to own the event and this view emits
    // it. The split by step is what keeps the two from double counting.
    renderEarn();
    await userEvent.click(screen.getByTestId("stub-pick-token"));

    act(() => {
      getTestStore()!.dispatch(
        submitFreighterSorobanTransaction.rejected(
          null,
          "req-1",
          {
            publicKey: TEST_PUBLIC_KEY,
            signedXDR: "AAAA-prepared",
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
          { errorMessage: "User declined access" },
        ),
      );
    });

    await waitFor(() =>
      expect(trackEarnDepositFailed).toHaveBeenCalledTimes(1),
    );
    expect(trackEarnDepositFailed).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: "User declined access" }),
    );
  });

  it("ignores an error status left behind by a previous flow", async () => {
    // Closing the in-flight screen navigates away and resets the submission,
    // but does not cancel the submit — a late rejection writes ERROR back into
    // a store the flow has already left. Re-entering Earn must not read that as
    // its own failure: it would emit against an empty asset and drop the fresh
    // flow onto the amount screen with nothing selected.
    render(
      <Wrapper
        routes={["/earn"]}
        state={{
          auth: { allAccounts: [TEST_PUBLIC_KEY], publicKey: TEST_PUBLIC_KEY },
          settings: { networkDetails: TESTNET_NETWORK_DETAILS },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            submitStatus: ActionStatus.ERROR,
            error: { errorMessage: "tx_bad_auth" },
          },
          earn: { ...earnInitialState, hasSeenIntro: true },
        }}
      >
        <Earn />
      </Wrapper>,
    );

    expect(await screen.findByTestId("stub-pick-token")).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(trackEarnDepositFailed).not.toHaveBeenCalled();
    // Still on the picker, not bounced to the amount screen.
    expect(screen.queryByTestId("stub-confirm-amount")).toBeNull();
  });

  it("mounts the terminal again when the user retries", async () => {
    // The teardown must not strand the flow: confirming again has to bring a
    // fresh terminal back, which is what makes a retry possible.
    renderEarn();
    await reachDepositTerminal();

    act(() => {
      getTestStore()!.dispatch(
        submitFreighterSorobanTransaction.rejected(
          null,
          "req-1",
          {
            publicKey: TEST_PUBLIC_KEY,
            signedXDR: "AAAA-prepared",
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
          { errorMessage: "tx_bad_auth" },
        ),
      );
    });

    await waitFor(() =>
      expect(screen.queryByTestId("stub-deposit-terminal")).toBeNull(),
    );

    await userEvent.click(screen.getByTestId("stub-confirm-amount"));

    expect(await screen.findByTestId("stub-deposit-terminal")).toBeDefined();
    expect(mockDepositMounts).toHaveBeenCalledTimes(2);
  });
});
