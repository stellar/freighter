import { filterHistoryEntries } from "popup/helpers/history/filters";
import {
  BalanceChangeRow,
  HistoryEntry,
  ResolvedToken,
} from "popup/views/AccountHistory/model";

const XLM_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

const xlm = (decimals: number | null = 7): ResolvedToken => ({
  code: "XLM",
  contractId: XLM_SAC,
  issuer: null,
  icon: null,
  decimals,
});

const received = (change: BalanceChangeRow): HistoryEntry =>
  ({
    id: "tx",
    kind: "received",
    createdAt: "2024-04-08T14:33:00Z",
    rowIcon: { type: "contract" },
    primaryText: "XLM",
    secondaryText: "Received",
    secondaryIcon: "received",
    amounts: null,
    details: {
      title: "Received XLM",
      status: "success",
      fee: "0.0000100",
      rate: null,
      contractId: null,
      functionName: null,
      protocol: null,
      counterparty: null,
      balanceChanges: [change],
      stateChangeCards: [],
      operations: [],
    },
  }) as HistoryEntry;

const filter = (entry: HistoryEntry) =>
  filterHistoryEntries([entry], {
    isHideDustEnabled: true,
    nativeTokenId: XLM_SAC,
  });

describe("filterHistoryEntries dust hiding", () => {
  it("hides a native credit at or below the dust threshold", () => {
    const entry = received({
      token: xlm(),
      amount: "0.05",
      direction: "credit",
    });
    expect(filter(entry)).toHaveLength(0);
  });

  it("keeps a native credit above the threshold", () => {
    const entry = received({
      token: xlm(),
      amount: "1.5",
      direction: "credit",
    });
    expect(filter(entry)).toHaveLength(1);
  });

  it("keeps an entry whose amount could not be scaled", () => {
    // an unknown token scale leaves the magnitude unknown, so it cannot be
    // classified as dust — hiding it would drop a row of unknown size
    const entry = received({
      token: xlm(null),
      amount: null,
      direction: "credit",
    });
    expect(filter(entry)).toHaveLength(1);
  });
});
