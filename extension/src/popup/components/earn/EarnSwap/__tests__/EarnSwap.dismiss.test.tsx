import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ActionStatus } from "@shared/api/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { EarnSwap } from "popup/components/earn/EarnSwap";
import {
  initialState as transactionSubmissionInitialState,
  submitFreighterTransaction,
} from "popup/ducks/transactionSubmission";
import { getTestStore, Wrapper } from "popup/__testHelpers__";

const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const USDC = `USDC:${USDC_ISSUER}`;

// The sheet's steps are irrelevant to what a dismissal means; stub them so the
// test is about the X and nothing else.
jest.mock("popup/components/InternalTransaction/SubmitTransaction", () => ({
  TransactionConfirm: () => <div data-testid="stub-confirm" />,
}));

jest.mock("popup/components/swap/SwapAmount", () => ({
  SwapAmount: () => <div data-testid="stub-amount" />,
}));

jest.mock("popup/components/swap/SwapAsset", () => ({
  SwapAsset: () => <div data-testid="stub-asset" />,
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const renderSheet = ({
  onDone,
  onCancel,
}: {
  onDone: jest.Mock;
  onCancel: jest.Mock;
}) =>
  render(
    <Wrapper
      routes={["/earn"]}
      state={{
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: "native",
            destinationAsset: USDC,
          },
        },
      }}
    >
      <EarnSwap
        destinationAsset={USDC}
        destinationTokenDetails={null}
        onDone={onDone}
        onCancel={onCancel}
      />
    </Wrapper>,
  );

// The sheet clears the submission on mount to seed itself, so success has to
// land after that — which is also the real ordering: the swap settles while the
// sheet is open.
const settleSwap = () =>
  act(() => {
    getTestStore()!.dispatch(
      submitFreighterTransaction.fulfilled({} as never, "req-1", {
        publicKey: "G123",
        signedXDR: "AAAA-signed",
        networkDetails: TESTNET_NETWORK_DETAILS,
      }),
    );
  });

describe("EarnSwap dismissal", () => {
  it("reports a completion when the sheet is closed after the swap succeeded", async () => {
    const onDone = jest.fn();
    const onCancel = jest.fn();
    renderSheet({ onDone, onCancel });
    settleSwap();

    expect(getTestStore()!.getState().transactionSubmission.submitStatus).toBe(
      ActionStatus.SUCCESS,
    );

    await userEvent.click(screen.getByTestId("earn-swap-close"));

    // The balance behind the sheet has changed. Treating this as a cancel is
    // what left the picker offering the token at its pre-swap balance.
    expect(onDone).toHaveBeenCalledWith({ fromCode: "XLM", toCode: "USDC" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("reports a cancellation when the sheet is closed before submitting", async () => {
    const onDone = jest.fn();
    const onCancel = jest.fn();
    renderSheet({ onDone, onCancel });

    await userEvent.click(screen.getByTestId("earn-swap-close"));

    expect(onCancel).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
