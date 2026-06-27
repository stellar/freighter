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
}: {
  destLevel?: SecurityLevel;
  sourceLevel?: SecurityLevel;
}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <ReviewTx
        {...swapProps}
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

describe("ReviewTx destination-token security gate", () => {
  it("shows the destination-token warning and the Confirm-anyway gate when the token is malicious", () => {
    renderWithDestLevel(SecurityLevel.MALICIOUS);
    expect(
      screen.getByTestId("review-tx-dest-token-warning"),
    ).toBeInTheDocument();
    // Case-3 "Confirm anyway" gate renders the dedicated CancelAction button.
    expect(screen.getByTestId("CancelAction")).toBeInTheDocument();
  });

  it("shows the destination-token warning when the token is suspicious", () => {
    renderWithDestLevel(SecurityLevel.SUSPICIOUS);
    expect(
      screen.getByTestId("review-tx-dest-token-warning"),
    ).toBeInTheDocument();
  });

  it("does not show a destination-token warning when the token is safe", () => {
    renderWithDestLevel(SecurityLevel.SAFE);
    expect(
      screen.queryByTestId("review-tx-dest-token-warning"),
    ).not.toBeInTheDocument();
  });

  it("shows the source-token warning + Confirm-anyway gate when the sell token is malicious", () => {
    renderReview({ sourceLevel: SecurityLevel.MALICIOUS });
    expect(
      screen.getByTestId("review-tx-source-token-warning"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("CancelAction")).toBeInTheDocument();
  });

  it("warns for both sides independently", () => {
    renderReview({
      sourceLevel: SecurityLevel.SUSPICIOUS,
      destLevel: SecurityLevel.MALICIOUS,
    });
    expect(
      screen.getByTestId("review-tx-source-token-warning"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("review-tx-dest-token-warning"),
    ).toBeInTheDocument();
  });
});
