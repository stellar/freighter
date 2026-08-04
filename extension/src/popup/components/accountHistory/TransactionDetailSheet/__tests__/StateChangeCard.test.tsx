import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { StateChangeCard } from "popup/components/accountHistory/TransactionDetailSheet/StateChangeCard";
import {
  DataEntrySheet,
  decodeDataValue,
} from "popup/components/accountHistory/TransactionDetailSheet/DataEntrySheet";
import {
  ResolvedToken,
  StateChangeCardData,
} from "popup/views/AccountHistory/model";

const token = (code: string): ResolvedToken => ({
  code,
  contractId: null,
  issuer: null,
  icon: null,
  decimals: 7,
});

const renderCard = (card: StateChangeCardData, onViewDataEntry = jest.fn()) => {
  render(
    <StateChangeCard
      card={card}
      allAccounts={[]}
      onViewDataEntry={onViewDataEntry}
    />,
  );
  return onViewDataEntry;
};

describe("StateChangeCard", () => {
  it("renders an account-created card", () => {
    renderCard({
      kind: "accountCreated",
      address: "GNEW",
      funder: "GFUNDER",
    });
    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Account created",
    );
  });

  it("renders signer weight transitions", () => {
    renderCard({
      kind: "signers",
      verb: "updated",
      entries: [{ address: "GSIGNER", weightOld: 1, weightNew: 2 }],
    });
    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Signer updated",
    );
    const oldnew = screen.getByTestId("state-change-oldnew");
    expect(oldnew).toHaveTextContent("1");
    expect(oldnew).toHaveTextContent("2");
  });

  it("renders a threshold transition", () => {
    renderCard({
      kind: "thresholds",
      level: "medium",
      valueOld: "2",
      valueNew: "3",
    });
    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Threshold updated",
    );
    expect(screen.getByTestId("state-change-oldnew")).toHaveTextContent("2");
    expect(screen.getByTestId("state-change-oldnew")).toHaveTextContent("3");
  });

  it("renders a home-domain transition", () => {
    renderCard({
      kind: "homeDomain",
      verb: "updated",
      domainOld: "stellar.org",
      domainNew: "stellar.com",
    });
    expect(screen.getByTestId("state-change-oldnew")).toHaveTextContent(
      "stellar.org",
    );
    expect(screen.getByTestId("state-change-oldnew")).toHaveTextContent(
      "stellar.com",
    );
  });

  it("renders set/cleared flags with signs", () => {
    renderCard({
      kind: "flags",
      set: ["Revocable"],
      cleared: ["Clawback"],
    });
    expect(screen.getByTestId("state-change-flag-set")).toHaveTextContent(
      "+Revocable",
    );
    expect(screen.getByTestId("state-change-flag-cleared")).toHaveTextContent(
      "\u2212Clawback",
    );
  });

  it("renders trustline limit transitions", () => {
    renderCard({
      kind: "trustlines",
      verb: "updated",
      entries: [{ token: token("USDC"), limitOld: "1000", limitNew: "10000" }],
    });
    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Trustline updated",
    );
    expect(screen.getByTestId("state-change-row")).toHaveTextContent("USDC");
    expect(screen.getByTestId("state-change-oldnew")).toHaveTextContent("1000");
  });

  it("renders balance authorizations", () => {
    renderCard({
      kind: "balanceAuthorizations",
      authorized: true,
      tokens: [token("USDC"), token("EURC")],
    });
    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Balance authorized",
    );
    expect(screen.getByTestId("state-change-row")).toHaveTextContent(
      "USDC, EURC",
    );
  });

  it("renders an allowance card", () => {
    renderCard({
      kind: "allowance",
      token: {
        code: "USDC",
        contractId: "CUSDC",
        issuer: "GISSUER",
        icon: null,
        decimals: 7,
      },
      spender: "GSPENDER",
      amount: "100",
      expirationLedger: 51_530_000,
    });
    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Allowance approved",
    );
  });

  it("labels the key column and reports taps per key", () => {
    const entries = [
      { key: "config-key", valueOldB64: null, valueNewB64: "aGVsbG8=" },
      { key: "other-key", valueOldB64: null, valueNewB64: "d29ybGQ=" },
    ];
    const onView = renderCard({ kind: "dataEntry", verb: "added", entries });

    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Data entry added",
    );
    expect(screen.getByText("Key")).toBeDefined();

    const keys = screen.getAllByTestId("state-change-key");
    expect(keys.map((key) => key.textContent)).toEqual([
      "config-key",
      "other-key",
    ]);

    fireEvent.click(keys[1]);
    expect(onView).toHaveBeenCalledWith({
      verb: "added",
      entry: entries[1],
    });
  });

  it("strikes through removed data-entry keys", () => {
    renderCard({
      kind: "dataEntry",
      verb: "removed",
      entries: [
        { key: "config-key", valueOldB64: "aGVsbG8=", valueNewB64: null },
      ],
    });
    expect(screen.getByText("config-key").className).toContain(
      "StateChangeCard__key-text--removed",
    );
  });
});

describe("DataEntrySheet", () => {
  it("decodes printable base64 values", () => {
    expect(decodeDataValue("aGVsbG8=")).toBe("hello");
  });

  it("falls back to base64 for binary values", () => {
    // base64 of bytes [0x00, 0x01]
    expect(decodeDataValue("AAE=")).toBe("AAE=");
  });

  it("returns null for empty values", () => {
    expect(decodeDataValue(null)).toBeNull();
  });

  it("renders the key and decoded value with close actions", () => {
    const onClose = jest.fn();
    render(
      <DataEntrySheet
        selection={{
          verb: "added",
          entry: {
            key: "config-key",
            valueOldB64: null,
            valueNewB64: "aGVsbG8=",
          },
        }}
        onClose={onClose}
      />,
    );
    expect(screen.getByTestId("data-entry-key")).toHaveTextContent(
      "config-key",
    );
    expect(screen.getByTestId("data-entry-value")).toHaveTextContent("hello");

    fireEvent.click(screen.getByTestId("data-entry-dismiss"));
    fireEvent.click(screen.getByTestId("data-entry-close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
