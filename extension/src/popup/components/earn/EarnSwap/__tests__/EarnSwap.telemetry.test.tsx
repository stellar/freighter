import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { emitScreenViewed } from "helpers/metrics";
import { EarnSwap } from "popup/components/earn/EarnSwap";
import {
  initialState as transactionSubmissionInitialState,
  submitFreighterTransaction,
} from "popup/ducks/transactionSubmission";
import { getTestStore, Wrapper } from "popup/__testHelpers__";

const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const USDC = `USDC:${USDC_ISSUER}`;

// The steps' own events are covered with the shared components; stub them so
// these tests are about what the sheet itself reports.
jest.mock("popup/components/InternalTransaction/SubmitTransaction", () => ({
  TransactionConfirm: () => <div data-testid="stub-confirm" />,
}));

jest.mock("popup/components/swap/SwapAmount", () => ({
  // Its token pill opens the source picker.
  SwapAmount: ({ goToEditSrc }: { goToEditSrc: () => void }) => (
    <button type="button" data-testid="stub-amount" onClick={goToEditSrc} />
  ),
}));

jest.mock("popup/components/swap/SwapAsset", () => ({
  SwapAsset: () => <div data-testid="stub-asset" />,
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const emitScreenViewedMock = emitScreenViewed as jest.Mock;
const callsFor = (screenName: string) =>
  emitScreenViewedMock.mock.calls.filter(([name]) => name === screenName);

const renderSheet = () =>
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
        sourceAsset="native"
        destinationAsset={USDC}
        destinationTokenDetails={null}
        onDone={jest.fn()}
        onCancel={jest.fn()}
      />
    </Wrapper>,
  );

const submitArgs = {
  publicKey: "G123",
  signedXDR: "AAAA-signed",
  networkDetails: TESTNET_NETWORK_DETAILS,
};

describe("EarnSwap telemetry", () => {
  afterEach(() => jest.clearAllMocks());

  it("reports the swap's screens as the Swap route does, tagged as Earn's", () => {
    renderSheet();

    expect(emitScreenViewedMock).toHaveBeenCalledWith("swap_amount", {
      flow: "swap",
      source: "earn",
    });
    expect(callsFor("earn_swap_amount")).toHaveLength(0);
  });

  it("tags the swap's own events as Earn's", () => {
    renderSheet();

    // Read by the shared swap components (confirm, quote expiry, outcome).
    expect(
      getTestStore()!.getState().transactionSubmission.transactionData
        .swapSource,
    ).toBe("earn");
  });

  it("reports the source picker", async () => {
    renderSheet();

    await userEvent.click(screen.getByTestId("stub-amount"));

    expect(emitScreenViewedMock).toHaveBeenCalledWith("swap_from_asset", {
      flow: "swap",
      source: "earn",
    });
  });

  it("reports processing, then success, once each", () => {
    renderSheet();

    act(() => {
      getTestStore()!.dispatch(
        submitFreighterTransaction.pending("req-1", submitArgs),
      );
    });
    act(() => {
      getTestStore()!.dispatch(
        submitFreighterTransaction.fulfilled({} as never, "req-1", submitArgs),
      );
    });

    expect(callsFor("swap_processing")).toEqual([
      ["swap_processing", { flow: "swap", step: "processing", source: "earn" }],
    ]);
    expect(callsFor("swap_success")).toEqual([
      ["swap_success", { flow: "swap", step: "success", source: "earn" }],
    ]);
  });
});
