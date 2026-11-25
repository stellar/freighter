import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { EarnDepositDetailsSheet } from "popup/components/earn/EarnDepositDetailsSheet";
import { Wrapper } from "popup/__testHelpers__";

jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  stellarSdkServer: jest.fn(),
}));

const source = Keypair.random().publicKey();
const ENVELOPE = new TransactionBuilder(new Account(source, "1"), {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.payment({
      destination: Keypair.random().publicKey(),
      asset: Asset.native(),
      amount: "1",
    }),
  )
  .setTimeout(0)
  .build()
  .toXDR();

/** Horizon answers the by-hash read with this record, or never. */
const mockHorizon = (record: Record<string, unknown> | null) => {
  (stellarSdkServer as jest.Mock).mockReturnValue({
    transactions: () => ({
      transaction: () => ({
        call: () =>
          record ? Promise.resolve(record) : new Promise(() => undefined),
      }),
    }),
  });
};

const renderSheet = (props = {}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <EarnDepositDetailsSheet
        amount="500"
        assetCode="USDC"
        assetIcons={{}}
        poolName="Fixed v2.1"
        transactionHash="abc"
        networkDetails={TESTNET_NETWORK_DETAILS}
        onClose={jest.fn()}
        {...props}
      />
    </Wrapper>,
  );

describe("EarnDepositDetailsSheet", () => {
  beforeEach(() => mockHorizon(null));

  // The title says which way the money moved, so the amount carries no sign.
  it("reads a deposit with an unsigned amount", () => {
    renderSheet({ xdr: ENVELOPE });

    expect(screen.getByTestId("earn-deposit-details")).toHaveTextContent(
      "Deposited {{code}}",
    );
    expect(screen.getByText("To")).toBeInTheDocument();
    expect(screen.getByText("Deposited")).toBeInTheDocument();
    expect(screen.getByTestId("earn-deposit-details-amount")).toHaveTextContent(
      /^500\.00 USDC$/,
    );
  });

  it("reads a withdrawal: from the pool, unsigned", () => {
    renderSheet({ type: "withdraw", xdr: ENVELOPE });

    expect(screen.getByTestId("earn-withdraw-details")).toHaveTextContent(
      "Withdrew {{code}}",
    );
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("Withdrew")).toBeInTheDocument();
    expect(
      screen.getByTestId("earn-withdraw-details-amount"),
    ).toHaveTextContent(/^500\.00 USDC$/);
  });

  it("shows the event's date before Horizon answers", () => {
    renderSheet({ occurredAt: "2026-08-28T14:33:00Z" });

    expect(
      screen.getByTestId("earn-deposit-details-date"),
    ).not.toHaveTextContent("--");
  });

  // From Activity there is no envelope in hand: Horizon's, from the same read
  // as the date and fee, backs "Transaction details".
  it("takes the envelope from Horizon when none is passed", async () => {
    mockHorizon({
      created_at: "2026-08-28T14:33:00Z",
      fee_charged: "51234",
      envelope_xdr: ENVELOPE,
    });
    renderSheet({ type: "withdraw" });

    expect(
      await screen.findByTestId("earn-withdraw-details-btn"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("earn-withdraw-details-fee")).toHaveTextContent(
      "0.0051234 XLM",
    );
  });

  it("leaves Transaction details out until there is an envelope", async () => {
    renderSheet();

    await waitFor(() =>
      expect(
        screen.getByTestId("earn-deposit-details-amount"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("earn-deposit-details-btn")).toBeNull();
  });
});
