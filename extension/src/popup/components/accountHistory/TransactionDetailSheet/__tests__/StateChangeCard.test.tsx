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

  it("renders a reserves sponsorship card", () => {
    renderCard({
      kind: "reserves",
      verb: "sponsored",
      sponsor: "GSPONSOR",
      sponsored: "GSPONSORED",
      detail: null,
    });
    expect(screen.getByTestId("state-change-title")).toHaveTextContent(
      "Reserve sponsored",
    );
  });

  it("makes a data-entry card interactive and reports taps", () => {
    const card: StateChangeCardData = {
      kind: "dataEntry",
      verb: "added",
      key: "config-key",
      valueOldB64: null,
      valueNewB64: "aGVsbG8=",
    };
    const onView = renderCard(card);
    const cardEl = screen.getByTestId("state-change-card");
    expect(cardEl.tagName).toBe("BUTTON");
    fireEvent.click(cardEl);
    expect(onView).toHaveBeenCalledWith(card);
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

  it("renders the key and decoded value with a close action", () => {
    const onClose = jest.fn();
    render(
      <DataEntrySheet
        card={{
          kind: "dataEntry",
          verb: "added",
          key: "config-key",
          valueOldB64: null,
          valueNewB64: "aGVsbG8=",
        }}
        onClose={onClose}
      />,
    );
    expect(screen.getByTestId("data-entry-key")).toHaveTextContent(
      "config-key",
    );
    expect(screen.getByTestId("data-entry-value")).toHaveTextContent("hello");
    fireEvent.click(screen.getByTestId("data-entry-close"));
    expect(onClose).toHaveBeenCalled();
  });
});
