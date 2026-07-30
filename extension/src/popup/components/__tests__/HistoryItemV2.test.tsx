import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { HistoryItemV2 } from "popup/components/accountHistory/HistoryItemV2";
import { HistoryEntry } from "popup/views/AccountHistory/model";

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

const baseEntry: HistoryEntry = {
  id: "tx-hash-1",
  kind: "sent",
  createdAt: "2024-05-27T10:00:00Z",
  rowIcon: { type: "contract" },
  primaryText: "XLM",
  secondaryText: "Sent",
  secondaryIcon: "sent",
  amounts: [{ text: "-3.00 XLM", direction: "debit" }],
  details: {
    title: "Sent XLM",
    status: "success",
    fee: "0.00001",
    rate: null,
    contractId: null,
    functionName: null,
    protocol: null,
    counterparty: null,
    balanceChanges: [],
    stateChangeCards: [],
    operations: [],
  },
};

const entry = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
  ...baseEntry,
  ...overrides,
});

const renderItem = (e: HistoryEntry, onClick = jest.fn()) => {
  render(<HistoryItemV2 entry={e} onClick={onClick} />);
  return onClick;
};

describe("HistoryItemV2", () => {
  it("renders primary text, secondary verb, and a debit amount", () => {
    renderItem(baseEntry);

    expect(screen.getByTestId("history-item-v2-primary")).toHaveTextContent(
      "XLM",
    );
    expect(screen.getByTestId("history-item-v2-secondary")).toHaveTextContent(
      "Sent",
    );
    const amount = screen.getByTestId("history-item-v2-amount");
    expect(amount).toHaveTextContent("-3.00 XLM");
    expect(amount).toHaveClass("HistoryItemV2__amount--debit");
  });

  it("renders a green credit amount for received entries", () => {
    renderItem(
      entry({
        kind: "received",
        secondaryText: "Received",
        secondaryIcon: "received",
        amounts: [{ text: "+40.40 USDC", direction: "credit" }],
      }),
    );

    const amount = screen.getByTestId("history-item-v2-amount");
    expect(amount).toHaveTextContent("+40.40 USDC");
    expect(amount).toHaveClass("HistoryItemV2__amount--credit");
  });

  it("renders only the received (credit) amount for a swap", () => {
    renderItem(
      entry({
        kind: "swapped",
        primaryText: "XLM to USDC",
        secondaryText: "Swapped",
        secondaryIcon: "swap",
        amounts: [{ text: "+40.40 USDC", direction: "credit" }],
      }),
    );

    const amounts = screen.getAllByTestId("history-item-v2-amount");
    expect(amounts).toHaveLength(1);
    expect(amounts[0]).toHaveTextContent("+40.40 USDC");
    expect(amounts[0]).toHaveClass("HistoryItemV2__amount--credit");
  });

  it("renders the literal 'Multiple' for multi-asset entries", () => {
    renderItem(entry({ kind: "contract", amounts: "multiple" }));

    const amount = screen.getByTestId("history-item-v2-amount");
    expect(amount).toHaveTextContent("Multiple");
    expect(amount).toHaveClass("HistoryItemV2__amount--multiple");
  });

  it("renders no amount for pure config-change entries", () => {
    renderItem(
      entry({
        kind: "other",
        primaryText: "Account settings",
        secondaryText: "Updated",
        secondaryIcon: "settings",
        amounts: null,
      }),
    );

    expect(screen.queryByTestId("history-item-v2-amount")).toBeNull();
  });

  it("formats the row date as 'MMM D'", () => {
    renderItem(baseEntry);
    expect(screen.getByText("May 27")).toBeInTheDocument();
  });

  it("calls onClick with the entry id when the row is clicked", () => {
    const onClick = renderItem(baseEntry);
    fireEvent.click(screen.getByTestId("history-item-v2"));
    expect(onClick).toHaveBeenCalledWith("tx-hash-1");
  });
});
