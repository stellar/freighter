import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionBuilder, Account } from "stellar-sdk";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  BlendRequestType,
  buildBlendRequestScVal,
  buildBlendSubmitOp,
} from "@shared/helpers/soroban/blend";
import { RequestState } from "constants/request";
import { EarnReview } from "popup/components/earn/EarnReview";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { Wrapper } from "popup/__testHelpers__";

const TEST_PUBLIC_KEY =
  "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

// Mainnet throughout: shouldTreatTxAsUnableToScan gates on isBlockaidEnabled,
// which is mainnet-only, and it reads the network from redux rather than the
// prop — so the store and the envelope's passphrase both have to be PUBLIC for
// these paths to be reachable at all.
const { networkPassphrase } = MAINNET_NETWORK_DETAILS;

// A real envelope: EarnReview parses the XDR for its details pane, so a
// placeholder string would leave the review half-rendered.
const buildDepositXdr = () =>
  new TransactionBuilder(new Account(TEST_PUBLIC_KEY, "1"), {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(
      buildBlendSubmitOp({
        poolId: POOL_ID,
        publicKey: TEST_PUBLIC_KEY,
        requests: [
          buildBlendRequestScVal({
            assetId: USDC_SAC,
            amount: "5000000",
            requestType: BlendRequestType.SupplyCollateral,
            networkPassphrase,
          }),
        ],
        networkPassphrase,
      }),
    )
    .setTimeout(180)
    .build()
    .toXDR();

const renderReview = ({
  scanResult,
  onConfirm = jest.fn(),
  onCancel = jest.fn(),
}: {
  scanResult?: unknown;
  onConfirm?: () => void;
  onCancel?: () => void;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        settings: { networkDetails: MAINNET_NETWORK_DETAILS },
        transactionSubmission: { ...transactionSubmissionInitialState },
      }}
    >
      <EarnReview
        pool={null}
        assetCode="USDC"
        assetIssuer={USDC_SAC}
        assetIcon={null}
        amount="0.5"
        amountUsd="0.50"
        apy={0.05}
        currentPosition="0"
        currentPositionUsd="0"
        fee="0.001"
        simulationState={
          {
            state: RequestState.SUCCESS,
            data: {
              transactionXdr: buildDepositXdr(),
              scanResult: scanResult ?? null,
              inclusionFee: "0.00001",
              resourceFee: "0.0546",
            },
            error: null,
          } as any
        }
        networkDetails={MAINNET_NETWORK_DETAILS}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </Wrapper>,
  );

describe("EarnReview Blockaid transaction verdict", () => {
  it("leaves the review untouched for a benign transaction", async () => {
    const onConfirm = jest.fn();
    renderReview({
      scanResult: { validation: { result_type: "Benign" } },
      onConfirm,
    });

    expect(
      screen.queryByTestId("earn-review-blockaid-warning"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("earn-review-confirm-anyway"),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("earn-review-confirm"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("warns and demotes Confirm for a malicious transaction", async () => {
    // The regression this closes: the scan verdict was computed and discarded,
    // so a flagged deposit confirmed on a plain primary button.
    const onConfirm = jest.fn();
    renderReview({
      scanResult: { validation: { result_type: "Malicious" } },
      onConfirm,
    });

    expect(
      screen.getByTestId("earn-review-blockaid-warning"),
    ).toHaveTextContent("This transaction was flagged as malicious");
    expect(screen.queryByTestId("earn-review-confirm")).not.toBeInTheDocument();
    // The warned row keeps the fee gear — the acknowledgement is appended
    // below it rather than replacing the row.
    expect(screen.getByTestId("earn-review-fees-btn")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("earn-review-confirm-anyway"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("warns and demotes Confirm for a suspicious transaction", () => {
    renderReview({ scanResult: { validation: { result_type: "Warning" } } });

    expect(
      screen.getByTestId("earn-review-blockaid-warning"),
    ).toHaveTextContent("This transaction was flagged as suspicious");
    expect(screen.queryByTestId("earn-review-confirm")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("earn-review-confirm-anyway"),
    ).toBeInTheDocument();
  });

  it("treats an absent scan on mainnet as unable-to-scan and gates on it", () => {
    // Mirrors ReviewTx: a deposit Blockaid could not scan still requires the
    // explicit acknowledgement rather than silently confirming.
    renderReview({ scanResult: null });

    expect(
      screen.getByTestId("earn-review-blockaid-warning"),
    ).toHaveTextContent("Proceed with caution");
    expect(screen.queryByTestId("earn-review-confirm")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("earn-review-confirm-anyway"),
    ).toBeInTheDocument();
  });

  it("opens the reasons sheet from the banner and returns to the review", async () => {
    renderReview({
      scanResult: {
        validation: {
          result_type: "Malicious",
          features: [
            {
              type: "Malicious",
              feature_id: "known_malicious",
              description:
                "An identified malicious address is associated with the token.",
            },
          ],
        },
      },
    });

    await userEvent.click(screen.getByTestId("earn-review-blockaid-warning"));

    const pane = await screen.findByTestId("earn-review-blockaid-pane");
    expect(pane).toHaveTextContent("Do not proceed");
    expect(pane).toHaveTextContent(
      "An identified malicious address is associated with the token.",
    );
    // The acknowledgement is reachable from the sheet too, not just the body.
    expect(
      screen.getByTestId("earn-review-confirm-anyway"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("blockaid-details-close"));
    expect(await screen.findByTestId("earn-review")).toBeInTheDocument();
  });
});
