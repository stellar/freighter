import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { RequestState } from "constants/request";
import { BlockaidWarning, SecurityLevel } from "popup/constants/blockaid";
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

// PUBLIC network so an absent tx scan is treated as UNABLE_TO_SCAN (Blockaid
// is only enabled on mainnet).
const MAINNET = {
  network: "PUBLIC",
  networkName: "Main Net",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  networkUrl: "https://horizon.stellar.org",
} as any;

const renderReview = ({
  destLevel,
  sourceLevel,
  scanResult,
  networkDetails,
  destWarnings,
  sourceWarnings,
}: {
  destLevel?: SecurityLevel;
  sourceLevel?: SecurityLevel;
  scanResult?: unknown;
  networkDetails?: typeof swapProps.networkDetails;
  destWarnings?: BlockaidWarning[];
  sourceWarnings?: BlockaidWarning[];
}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <ReviewTx
        {...swapProps}
        networkDetails={networkDetails ?? swapProps.networkDetails}
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
        sourceTokenSecurityWarnings={sourceWarnings}
        destinationTokenDetails={{
          tokenCode: "AQUA",
          requiresTrustline: true,
          decimals: 7,
          issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
          securityLevel: destLevel,
          securityWarnings: destWarnings,
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

  it("shows the malicious-token banner even when the tx could not be scanned (token outranks unable-to-scan)", () => {
    // Mainnet + absent scan => tx verdict is UNABLE_TO_SCAN; a malicious token
    // must not be downgraded to the soft "proceed with caution" tx banner.
    renderReview({
      networkDetails: MAINNET,
      scanResult: null,
      destLevel: SecurityLevel.MALICIOUS,
    });
    expect(screen.getByTestId("review-tx-token-warning")).toHaveTextContent(
      "The token you're receiving was flagged as malicious by Blockaid.",
    );
    expect(
      screen.queryByTestId("blockaid-unable-to-scan-label"),
    ).not.toBeInTheDocument();
  });

  it("shows friendly Blockaid feature descriptions in the expanded pane, not the raw validation string", () => {
    renderReview({
      scanResult: {
        validation: {
          result_type: "Malicious",
          description:
            "Token issuer <Address [type=ACCOUNT address=GBNW7FS6...]> is flagged as malicious",
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
    // Open the expandable Blockaid pane from the transaction banner.
    fireEvent.click(screen.getByTestId("blockaid-malicious-label"));
    expect(
      screen.getByText(
        "An identified malicious address is associated with the token.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Token issuer <Address/)).not.toBeInTheDocument();
  });

  it("lists the destination token-scan reasons alongside the raw transaction-scan reason (mobile parity)", () => {
    renderReview({
      // Raw developer string with no per-feature descriptions — shown verbatim,
      // matching mobile.
      scanResult: {
        validation: {
          result_type: "Malicious",
          description:
            "Token issuer <Address [type=ACCOUNT address=GBNW7FS6...]> is flagged as malicious",
        },
      },
      destWarnings: [
        {
          description:
            "An identified malicious address is associated with the token.",
          isError: true,
          featureId: "known_malicious",
        },
      ],
    });
    fireEvent.click(screen.getByTestId("blockaid-malicious-label"));
    // Both reasons appear together in the same list.
    expect(screen.getByText(/Token issuer <Address/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "An identified malicious address is associated with the token.",
      ),
    ).toBeInTheDocument();
  });

  it("does not duplicate a token-scan reason already shown by the transaction scan", () => {
    const shared =
      "An identified malicious address is associated with the token.";
    renderReview({
      // The tx scan already surfaces this exact friendly reason via a feature.
      scanResult: {
        validation: {
          result_type: "Malicious",
          description: "raw fallback",
          features: [
            {
              type: "Malicious",
              feature_id: "known_malicious",
              description: shared,
            },
          ],
        },
      },
      // Destination token carries the same reason — it must not appear twice.
      destWarnings: [
        { description: shared, isError: true, featureId: "known_malicious" },
      ],
    });
    fireEvent.click(screen.getByTestId("blockaid-malicious-label"));
    expect(screen.getAllByText(shared)).toHaveLength(1);
  });
});
