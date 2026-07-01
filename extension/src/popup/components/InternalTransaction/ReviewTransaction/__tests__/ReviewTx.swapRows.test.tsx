import React from "react";
import { render, screen } from "@testing-library/react";

import { RequestState } from "constants/request";
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
    data: {
      transactionXdr: "AAAA",
      dstAmountPriceUsd: "0",
      scanResult: null,
    },
    error: null,
  } as any,
  dstAsset: {
    icon: null,
    canonical: "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
    priceUsd: null,
    amount: "25",
  },
};

describe("ReviewTx swap rows", () => {
  it("renders the Rate row (no destMin needed) computed from send/destination amounts", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <ReviewTx {...swapProps} />
      </Wrapper>,
    );
    // 25 received / 10 sent => 2.5 per source unit
    expect(screen.getByTestId("review-tx-rate").textContent).toContain("2.5");
  });

  it("does not render a Minimum received row", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <ReviewTx {...swapProps} />
      </Wrapper>,
    );
    expect(
      screen.queryByTestId("review-tx-minimum-received"),
    ).not.toBeInTheDocument();
  });

  it("hides the Memo row on swaps (swaps carry no memo)", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <ReviewTx {...swapProps} />
      </Wrapper>,
    );
    expect(screen.queryByTestId("review-tx-memo")).not.toBeInTheDocument();
  });
});
