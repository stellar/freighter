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
  destMin: "24.5",
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
    const banner = screen.getByTestId("review-tx-trustline-banner");
    // i18n interpolation is not processed in the test environment;
    // confirm the banner element is present (tokenCode wired) and clickable
    expect(banner).toBeInTheDocument();
    fireEvent.click(banner);
    expect(screen.getByTestId("trustline-info-sheet")).toBeInTheDocument();
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
