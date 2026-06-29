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

  it("submits directly from the 'Do not proceed' pane via 'Confirm anyway' (no 'Continue' bounce)", () => {
    const onConfirm = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <ReviewTx
          {...swapProps}
          onConfirm={onConfirm}
          simulationState={
            {
              state: RequestState.SUCCESS,
              data: {
                transactionXdr: "AAAA",
                dstAmountPriceUsd: "0",
                scanResult: {
                  validation: {
                    result_type: "Malicious",
                    description: "flagged",
                  },
                },
              },
              error: null,
            } as any
          }
        />
      </Wrapper>,
    );
    // Open the "Do not proceed" pane from the malicious banner.
    fireEvent.click(screen.getByTestId("blockaid-malicious-label"));
    expect(screen.getByText("Do not proceed")).toBeInTheDocument();
    // The pane's action reads "Confirm anyway", not the old "Continue"...
    expect(screen.queryByText("Continue")).not.toBeInTheDocument();
    // ...and clicking it confirms the transaction directly.
    fireEvent.click(screen.getByText("Confirm anyway"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("opens the pane from the token banner and lists token reasons when the tx scan is clean (token-only flag)", () => {
    renderReview({
      // Clean / absent transaction scan — only the picked token is flagged, the
      // common mainnet swap-to-a-bad-token case.
      scanResult: null,
      destLevel: SecurityLevel.MALICIOUS,
      destWarnings: [
        {
          description:
            "An identified malicious address is associated with the token.",
          isError: true,
          featureId: "known_malicious",
        },
      ],
    });
    // The consolidated token banner is shown; clicking it opens the pane that
    // lists the friendly token-scan reason (mobile parity).
    fireEvent.click(screen.getByTestId("review-tx-token-warning"));
    expect(screen.getByText("Do not proceed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "An identified malicious address is associated with the token.",
      ),
    ).toBeInTheDocument();
  });

  it("escalates the pane title to 'Suspicious Request' for a suspicious (non-malicious) token reason", () => {
    renderReview({
      scanResult: null,
      destLevel: SecurityLevel.SUSPICIOUS,
      destWarnings: [
        {
          description: "This token shows signs of suspicious activity.",
          isError: false,
          featureId: "suspicious_activity",
        },
      ],
    });
    fireEvent.click(screen.getByTestId("review-tx-token-warning"));
    expect(screen.getByText("Suspicious Request")).toBeInTheDocument();
    expect(screen.queryByText("Do not proceed")).not.toBeInTheDocument();
    expect(
      screen.getByText("This token shows signs of suspicious activity."),
    ).toBeInTheDocument();
  });

  it("lists the source token reason in the pane (source-only flag)", () => {
    renderReview({
      scanResult: null,
      sourceLevel: SecurityLevel.MALICIOUS,
      sourceWarnings: [
        {
          description: "The sending token is associated with a known scam.",
          isError: true,
          featureId: "source_scam",
        },
      ],
    });
    fireEvent.click(screen.getByTestId("review-tx-token-warning"));
    expect(
      screen.getByText("The sending token is associated with a known scam."),
    ).toBeInTheDocument();
  });

  it("opens the pane from an unable-to-scan token banner that has no per-feature reasons", () => {
    renderReview({
      scanResult: null,
      destLevel: SecurityLevel.UNABLE_TO_SCAN,
      // No destWarnings — Blockaid returned no per-feature reasons.
    });
    const banner = screen.getByTestId("review-tx-token-warning");
    fireEvent.click(banner);
    // The pane opens and shows the consolidated message as its reason; an
    // unable-to-scan token is neither malicious nor suspicious, so the title is
    // the soft "Proceed with caution".
    expect(screen.getByText("Proceed with caution")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The token you're receiving couldn't be scanned for security risks.",
      ),
    ).toBeInTheDocument();
  });

  it("opens 'Do not proceed' from a malicious token banner with no per-feature reasons", () => {
    renderReview({
      scanResult: null,
      destLevel: SecurityLevel.MALICIOUS,
      // No destWarnings — flagged via result_type only.
    });
    fireEvent.click(screen.getByTestId("review-tx-token-warning"));
    // Malicious fallback row drives the hard "Do not proceed" title, and the
    // consolidated message shows as the reason.
    expect(screen.getByText("Do not proceed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The token you're receiving was flagged as malicious by Blockaid.",
      ),
    ).toBeInTheDocument();
  });

  it("dismisses the in-flow sheet via its close (X) control and returns to the review body", () => {
    renderReview({
      scanResult: null,
      destLevel: SecurityLevel.MALICIOUS,
      destWarnings: [
        {
          description:
            "An identified malicious address is associated with the token.",
          isError: true,
          featureId: "known_malicious",
        },
      ],
    });
    fireEvent.click(screen.getByTestId("review-tx-token-warning"));
    expect(screen.getByText("Do not proceed")).toBeInTheDocument();
    // The review body (XDR row) is hidden while the sheet is open.
    expect(screen.queryByText("XDR")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("blockaid-details-close"));
    // Sheet content gone; review body restored.
    expect(screen.queryByText("Do not proceed")).not.toBeInTheDocument();
    expect(screen.getByText("XDR")).toBeInTheDocument();
  });

  it("opens the in-flow sheet and confirms from a flagged Send transaction (no swap token)", () => {
    const onConfirm = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <ReviewTx
          assetIcon={null}
          fee="0.001"
          sendAmount="10"
          sendPriceUsd={null}
          srcAsset="native"
          networkDetails={swapProps.networkDetails}
          title="You are sending"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
          simulationState={
            {
              state: RequestState.SUCCESS,
              data: {
                transactionXdr: "AAAA",
                scanResult: {
                  validation: {
                    result_type: "Malicious",
                    description: "flagged",
                  },
                },
              },
              error: null,
            } as any
          }
        />
      </Wrapper>,
    );
    // Send has no destination token, so only the tx banner applies; it opens
    // the same in-flow sheet.
    fireEvent.click(screen.getByTestId("blockaid-malicious-label"));
    expect(screen.getByTestId("CancelAction")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm anyway"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
