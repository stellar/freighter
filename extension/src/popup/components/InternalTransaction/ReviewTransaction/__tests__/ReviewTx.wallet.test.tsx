import React from "react";
import { render, screen, within } from "@testing-library/react";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { RequestState } from "constants/request";
import { Wrapper } from "popup/__testHelpers__";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";

const PUBLIC_KEY = "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

const renderReview = (allAccounts: { publicKey: string; name: string }[]) =>
  render(
    <Wrapper
      state={{
        auth: {
          allAccounts,
          publicKey: PUBLIC_KEY,
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        },
      }}
      routes={["/"]}
    >
      <ReviewTx
        assetIcon={null}
        fee="0.001"
        sendAmount="10"
        sendPriceUsd={null}
        srcAsset="native"
        networkDetails={
          {
            network: "TESTNET",
            networkName: "Test Net",
            networkPassphrase: "Test SDF Network ; September 2015",
            networkUrl: "https://horizon-testnet.stellar.org",
          } as any
        }
        title="You are swapping"
        sheetTitle="Review swap"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        simulationState={
          {
            state: RequestState.SUCCESS,
            data: {
              transactionXdr: "AAAA",
              dstAmountPriceUsd: "0",
              scanResult: null,
            },
            error: null,
          } as any
        }
        dstAsset={{
          icon: null,
          canonical: `AQUA:${PUBLIC_KEY}`,
          priceUsd: null,
          amount: "25",
        }}
      />
    </Wrapper>,
  );

describe("ReviewTx Wallet row", () => {
  it("names the account that signs, with its avatar", () => {
    renderReview([{ publicKey: PUBLIC_KEY, name: "Account 1" }]);

    const row = screen.getByTestId("review-tx-wallet");
    expect(row).toHaveTextContent("Wallet");
    expect(row).toHaveTextContent("Account 1");
    expect(within(row).getByTestId("identicon-img")).toBeInTheDocument();
  });

  it("shows the account's short key when it has no name", () => {
    renderReview([]);

    expect(screen.getByTestId("review-tx-wallet")).toHaveTextContent(
      "GBNZ…AQUA",
    );
  });

  it("comes first in the details card", () => {
    renderReview([{ publicKey: PUBLIC_KEY, name: "Account 1" }]);

    const card = screen.getByTestId("review-tx-wallet").parentElement!;
    expect(card.firstElementChild).toBe(screen.getByTestId("review-tx-wallet"));
    // Rate and Fee follow it.
    expect(card).toHaveTextContent(/Wallet.*Rate.*Fee/);
  });
});
