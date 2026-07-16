import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { RequestState } from "constants/request";
import { Wrapper } from "popup/__testHelpers__";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";

const baseProps = {
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

describe("ReviewTx trustline banner", () => {
  it("renders the banner when destination requires a trustline", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <ReviewTx
          {...baseProps}
          destinationTokenDetails={{
            tokenCode: "AQUA",
            requiresTrustline: true,
            decimals: 7,
            issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
          }}
        />
      </Wrapper>,
    );
    // The review body is visible before the sheet opens.
    expect(
      screen.getByTestId("review-tx-send-destination"),
    ).toBeInTheDocument();

    const banner = screen.getByTestId("review-tx-trustline-banner");
    // i18n interpolation is not processed in the test environment;
    // confirm the banner element is present (tokenCode wired) and clickable
    expect(banner).toBeInTheDocument();
    fireEvent.click(banner);

    // The trustline sheet opens and the review body is hidden behind it (so it
    // doesn't show as a ghost), then is restored when the sheet is closed.
    expect(screen.getByTestId("trustline-info-sheet")).toBeInTheDocument();
    expect(
      screen.queryByTestId("review-tx-send-destination"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("trustline-info-sheet-close"));
    expect(
      screen.getByTestId("review-tx-send-destination"),
    ).toBeInTheDocument();
  });

  it("does not render the banner when no trustline is required", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <ReviewTx
          {...baseProps}
          destinationTokenDetails={{
            tokenCode: "AQUA",
            requiresTrustline: false,
            decimals: 7,
            issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
          }}
        />
      </Wrapper>,
    );
    expect(
      screen.queryByTestId("review-tx-trustline-banner"),
    ).not.toBeInTheDocument();
  });
});
