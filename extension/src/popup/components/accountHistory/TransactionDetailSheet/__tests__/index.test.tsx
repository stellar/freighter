import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { makeDummyStore } from "popup/__testHelpers__";
import { TransactionDetailSheet } from "popup/components/accountHistory/TransactionDetailSheet";
import {
  HistoryEntry,
  HistoryEntryKind,
  ResolvedToken,
} from "popup/views/AccountHistory/model";

jest.mock("popup/helpers/navigate", () => ({
  openTab: jest.fn(),
}));

import { openTab } from "popup/helpers/navigate";

const token = (code: string): ResolvedToken => ({
  code,
  contractId: null,
  issuer: null,
  icon: null,
  decimals: 7,
});

const makeEntry = (
  kind: HistoryEntryKind,
  overrides: Partial<HistoryEntry["details"]> = {},
  entryOverrides: Partial<HistoryEntry> = {},
): HistoryEntry => ({
  id: "tx-hash-abc",
  kind,
  createdAt: "2024-04-08T14:33:00Z",
  rowIcon: { type: "contract" },
  primaryText: "XLM",
  secondaryText: "Sent",
  secondaryIcon: "sent",
  amounts: null,
  details: {
    title: "Sent XLM",
    status: "success",
    fee: "0.0051234",
    rate: null,
    contractId: null,
    functionName: null,
    protocol: null,
    counterparty: null,
    balanceChanges: [],
    stateChangeCards: [],
    operations: [],
    ...overrides,
  },
  ...entryOverrides,
});

const ACCOUNTS = [
  {
    publicKey: "GCOUNTERPARTY7777777777777777777777777777777777777777777",
    name: "Account 2",
    imported: false,
  },
];

const renderSheet = (entry: HistoryEntry) => {
  const store = makeDummyStore({
    auth: {
      allAccounts: ACCOUNTS,
      publicKey: "GSELF",
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    },
  });
  return render(
    <Provider store={store}>
      <TransactionDetailSheet
        entry={entry}
        networkDetails={TESTNET_NETWORK_DETAILS}
      />
    </Provider>,
  );
};

describe("TransactionDetailSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the header title and timestamp", () => {
    renderSheet(makeEntry("sent", { title: "Sent XLM" }));
    expect(screen.getByTestId("detail-header-title")).toHaveTextContent(
      "Sent XLM",
    );
    expect(screen.getByTestId("detail-header")).toHaveTextContent(
      "Apr 8, 2024",
    );
  });

  it("renders a debit balance change with a minus sign for a send", () => {
    renderSheet(
      makeEntry("sent", {
        balanceChanges: [
          { token: token("XLM"), amount: "40.00", direction: "debit" },
        ],
        counterparty: ACCOUNTS[0].publicKey,
      }),
    );
    const amount = screen.getByTestId("balance-change-amount");
    expect(amount).toHaveTextContent("\u221240.00 XLM");
    expect(amount).toHaveClass("TransactionDetailSheet__balance-amount--debit");
    // counterparty resolves to the named account and is labelled "To"
    expect(screen.getByTestId("balance-counterparty")).toHaveTextContent("To");
    expect(
      within(screen.getByTestId("balance-counterparty")).getByTestId(
        "KeyIdenticonKey",
      ),
    ).toHaveTextContent("Account 2");
  });

  it("renders an em dash for a balance change whose token scale is unknown", () => {
    renderSheet(
      makeEntry("sent", {
        balanceChanges: [
          // amount is null when no source could resolve the token's decimals
          { token: token("CBI7…IHRV"), amount: null, direction: "debit" },
        ],
      }),
    );
    const amount = screen.getByTestId("balance-change-amount");
    expect(amount).toHaveTextContent("— CBI7…IHRV");
    expect(amount).not.toHaveTextContent("NaN");
  });

  it("renders a credit balance change and a From label for a receive", () => {
    renderSheet(
      makeEntry("received", {
        title: "Received USDC",
        balanceChanges: [
          { token: token("USDC"), amount: "40.40", direction: "credit" },
        ],
        counterparty: "GEXTERNALADDR999999999999999999999999999999999999999999",
      }),
    );
    const amount = screen.getByTestId("balance-change-amount");
    expect(amount).toHaveTextContent("+40.40 USDC");
    expect(amount).toHaveClass(
      "TransactionDetailSheet__balance-amount--credit",
    );
    expect(screen.getByTestId("balance-counterparty")).toHaveTextContent(
      "From",
    );
    // an external address gets an identicon and a single truncated label — no
    // owned-account name to resolve, and no second copy of the address
    const counterparty = within(screen.getByTestId("balance-counterparty"));
    expect(counterparty.getAllByTestId("identicon-img")).toHaveLength(1);
    expect(counterparty.getByTestId("KeyIdenticonKey")).toHaveTextContent("…");
  });

  it("renders stacked amounts and a rate row for a swap", () => {
    renderSheet(
      makeEntry("swapped", {
        title: "Swapped XLM to USDC",
        rate: "1 XLM ≈ 1.01 USDC",
        balanceChanges: [
          { token: token("USDC"), amount: "40.40", direction: "credit" },
          { token: token("XLM"), amount: "40", direction: "debit" },
        ],
      }),
    );
    expect(screen.getAllByTestId("balance-change-amount")).toHaveLength(2);
    expect(screen.getByTestId("meta-rate")).toHaveTextContent(
      "1 XLM ≈ 1.01 USDC",
    );
  });

  it("renders the fee and success status in the meta card", () => {
    renderSheet(makeEntry("sent"));
    expect(screen.getByTestId("meta-fee")).toHaveTextContent("0.0051234 XLM");
    expect(screen.getByTestId("meta-status")).toHaveTextContent("Success");
  });

  it("renders a failed status for failed transactions", () => {
    renderSheet(makeEntry("failed", { status: "failed", title: "Contract" }));
    const status = screen.getByTestId("meta-status");
    expect(status).toHaveTextContent("Failed");
  });

  it("navigates to the advanced sheet and back", () => {
    renderSheet(makeEntry("sent"));
    expect(screen.queryByTestId("advanced-sheet")).toBeNull();

    fireEvent.click(screen.getByTestId("transaction-details-link"));
    expect(screen.getByTestId("advanced-sheet")).toBeInTheDocument();
    expect(screen.queryByTestId("transaction-detail-sheet")).toBeNull();

    fireEvent.click(screen.getByTestId("advanced-back"));
    expect(screen.getByTestId("transaction-detail-sheet")).toBeInTheDocument();
  });

  it("opens the transaction on stellar.expert", () => {
    renderSheet(makeEntry("sent"));
    fireEvent.click(screen.getByTestId("view-on-stellar-expert"));
    expect(openTab).toHaveBeenCalledWith(
      "https://stellar.expert/explorer/testnet/tx/tx-hash-abc",
    );
  });
});
