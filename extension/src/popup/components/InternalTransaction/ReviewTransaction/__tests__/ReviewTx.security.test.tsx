import React from "react";
import { render, screen } from "@testing-library/react";

import { RequestState } from "constants/request";
import { SecurityLevel } from "popup/constants/blockaid";
import { Wrapper } from "popup/__testHelpers__";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";

const swapProps = {
  assetIcon: null,
  fee: "0.001",
  sendAmount: "10",
  sendPriceUsd: null,
  srcAsset: "native",
  networkDetails: {
    network: "TESTNET",
    networkName: "Test Net",
    networkPassphrase: "Test SDF Network ; September 2015",
    networkUrl: "https://horizon-testnet.stellar.org",
  } as any,
  title: "You are swapping",
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  simulationState: {
    state: RequestState.SUCCESS,
    data: { transactionXdr: "AAAA", dstAmountPriceUsd: "0", scanResult: null },
    error: null,
  } as any,
  dstAsset: {
    icon: null,
    canonical: "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
    priceUsd: null,
    amount: "25",
  },
};

const renderReview = ({
  destLevel,
  sourceLevel,
  scanResult,
}: {
  destLevel?: SecurityLevel;
  sourceLevel?: SecurityLevel;
  scanResult?: unknown;
}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <ReviewTx
        {...swapProps}
        simulationState={
          {
            state: RequestState.SUCCESS,
            data: {
              transactionXdr: "AAAA",
              dstAmountPriceUsd: "0",
              scanResult: scanResult ?? null,
            },
            error: null,
          } as any
        }
        sourceTokenSecurityLevel={sourceLevel}
        destinationTokenDetails={{
          tokenCode: "AQUA",
          requiresTrustline: true,
          decimals: 7,
          issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
          securityLevel: destLevel,
        }}
      />
    </Wrapper>,
  );

const renderWithDestLevel = (destLevel?: SecurityLevel) =>
  renderReview({ destLevel });

describe("ReviewTx Blockaid security banner (single, by priority) + badges", () => {
  it("shows one malicious token banner, the Confirm-anyway gate, and the icon badge for a malicious destination", () => {
    renderWithDestLevel(SecurityLevel.MALICIOUS);
    const banner = screen.getByTestId("review-tx-token-warning");
    expect(banner).toHaveTextContent(
      "The token you're receiving was flagged as malicious by Blockaid.",
    );
    // Case-3 "Confirm anyway" gate renders the dedicated CancelAction button.
    expect(screen.getByTestId("CancelAction")).toBeInTheDocument();
    // The warning badge overlays the (destination) token icon.
    expect(screen.getAllByTestId("ScamAssetIcon").length).toBe(1);
  });

  it("shows one suspicious token banner for a suspicious destination", () => {
    renderWithDestLevel(SecurityLevel.SUSPICIOUS);
    expect(screen.getByTestId("review-tx-token-warning")).toHaveTextContent(
      "The token you're receiving was flagged as suspicious by Blockaid.",
    );
  });

  it("does not show a token warning or a badge when the token is safe", () => {
    renderWithDestLevel(SecurityLevel.SAFE);
    expect(
      screen.queryByTestId("review-tx-token-warning"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("ScamAssetIcon")).not.toBeInTheDocument();
  });

  it("shows one source-token banner + Confirm-anyway gate + badge when the sell token is malicious", () => {
    renderReview({ sourceLevel: SecurityLevel.MALICIOUS });
    expect(screen.getByTestId("review-tx-token-warning")).toHaveTextContent(
      "The token you're sending was flagged as malicious by Blockaid.",
    );
    expect(screen.getByTestId("CancelAction")).toBeInTheDocument();
    expect(screen.getAllByTestId("ScamAssetIcon").length).toBe(1);
  });

  it("collapses both flagged sides into a single banner (worst level wins) but badges both icons", () => {
    renderReview({
      sourceLevel: SecurityLevel.SUSPICIOUS,
      destLevel: SecurityLevel.MALICIOUS,
    });
    // Exactly one banner, reflecting the worst level (malicious destination).
    const banners = screen.getAllByTestId("review-tx-token-warning");
    expect(banners).toHaveLength(1);
    expect(banners[0]).toHaveTextContent(
      "The token you're receiving was flagged as malicious by Blockaid.",
    );
    // ...but the per-icon badge still appears on both flagged tokens.
    expect(screen.getAllByTestId("ScamAssetIcon").length).toBe(2);
  });

  it("prefers the transaction-scan banner over the token banner (tx outranks token)", () => {
    renderReview({
      destLevel: SecurityLevel.MALICIOUS,
      scanResult: { validation: { result_type: "Malicious" } },
    });
    // The transaction banner (which opens the expandable pane) is shown...
    expect(screen.getByTestId("blockaid-malicious-label")).toBeInTheDocument();
    // ...and the token banner is suppressed so only one Blockaid banner shows.
    expect(
      screen.queryByTestId("review-tx-token-warning"),
    ).not.toBeInTheDocument();
  });
});
