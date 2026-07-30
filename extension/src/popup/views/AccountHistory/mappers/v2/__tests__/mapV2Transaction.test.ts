import {
  MOCK_ACCOUNT_2,
  MOCK_EURC_SAC,
  MOCK_EXTERNAL,
  MOCK_ROUTER_CONTRACT,
  MOCK_SELF,
  MOCK_USDC_SAC,
  MOCK_XLM_SAC,
  mockAccountCreated,
  mockAccountMerged,
  mockBalanceAuthChanged,
  mockContractMultiAsset,
  mockContractNoBalanceChange,
  mockDataEntryAdded,
  mockDataEntryMulti,
  mockFailedTransaction,
  mockFlagsChanged,
  mockHistoryTransactions,
  mockHomeDomainUpdated,
  mockPaymentReceived,
  mockPaymentSent,
  mockReservesSponsored,
  mockSignerAdded,
  mockSignerMulti,
  mockSwapClassicDex,
  mockSwapViaContract,
  mockThresholdsChange,
  mockTokenTransferSent,
  mockTrustlineAdded,
  mockTrustlineMulti,
} from "@shared/api/fixtures/history-v2";
import { ResolvedToken } from "popup/views/AccountHistory/model";
import { TokenContext } from "popup/helpers/history/tokenResolver";
import { collectTokenIds, mapV2Transaction, MapV2Context } from "../index";

const token = (
  code: string,
  contractId: string,
  icon: string | null = null,
): ResolvedToken => ({
  code,
  contractId,
  issuer: null,
  icon,
  decimals: 7,
});

const tokens: TokenContext = new Map([
  [MOCK_XLM_SAC, token("XLM", MOCK_XLM_SAC)],
  [MOCK_USDC_SAC, token("USDC", MOCK_USDC_SAC, "usdc.png")],
  [MOCK_EURC_SAC, token("EURC", MOCK_EURC_SAC)],
]);

const ctx: MapV2Context = {
  tokens,
  publicKey: MOCK_SELF,
  nativeTokenId: MOCK_XLM_SAC,
};

describe("collectTokenIds", () => {
  it("collects every token contract id referenced by a page", () => {
    const ids = collectTokenIds(mockHistoryTransactions);
    expect(ids).toEqual(
      expect.arrayContaining([MOCK_XLM_SAC, MOCK_USDC_SAC, MOCK_EURC_SAC]),
    );
  });
});

describe("mapV2Transaction", () => {
  it("maps a classic DEX swap", () => {
    const entry = mapV2Transaction(mockSwapClassicDex, ctx);

    expect(entry.kind).toBe("swapped");
    expect(entry.primaryText).toBe("XLM to USDC");
    expect(entry.secondaryText).toBe("Swapped");
    expect(entry.secondaryIcon).toBe("swap");
    expect(entry.rowIcon).toEqual({
      type: "asset",
      tokens: [tokens.get(MOCK_XLM_SAC), tokens.get(MOCK_USDC_SAC)],
    });
    expect(entry.amounts).toEqual([
      { text: "+40.4 USDC", direction: "credit" },
      { text: "-40 XLM", direction: "debit" },
    ]);
    expect(entry.details.title).toBe("Swapped XLM to USDC");
    expect(entry.details.rate).toBe("1 XLM ≈ 1.01 USDC");
    expect(entry.details.fee).toBe("0.0051234");
    // fee entry excluded from display rows
    expect(entry.details.balanceChanges).toHaveLength(2);
    expect(entry.details.status).toBe("success");
  });

  it("maps a swap routed through an unknown contract with the fallback treatment", () => {
    const entry = mapV2Transaction(mockSwapViaContract, ctx);

    expect(entry.kind).toBe("swapped");
    // no protocol match yet → "Contract" + token icons
    expect(entry.primaryText).toBe("Contract");
    expect(entry.rowIcon.type).toBe("asset");
    expect(entry.details.title).toBe("Contract");
    expect(entry.details.contractId).toBe(MOCK_ROUTER_CONTRACT);
    expect(entry.details.functionName).toBe("swap");
    expect(entry.details.protocol).toBeNull();
    expect(entry.details.rate).toBe("1 XLM ≈ 1.01 USDC");
  });

  it("maps a multi-asset contract call to 'Multiple'", () => {
    const entry = mapV2Transaction(mockContractMultiAsset, ctx);

    expect(entry.kind).toBe("contract");
    expect(entry.amounts).toBe("multiple");
    expect(entry.primaryText).toBe("Contract");
    // stacked icons over the distinct moved tokens (XLM, EURC, USDC)
    expect(entry.rowIcon).toEqual({
      type: "asset",
      tokens: [
        tokens.get(MOCK_XLM_SAC),
        tokens.get(MOCK_EURC_SAC),
        tokens.get(MOCK_USDC_SAC),
      ],
    });
    expect(entry.details.balanceChanges).toHaveLength(6);
  });

  it("maps a fee-only contract call", () => {
    const entry = mapV2Transaction(mockContractNoBalanceChange, ctx);

    expect(entry.kind).toBe("contract");
    expect(entry.amounts).toBeNull();
    expect(entry.primaryText).toBe("Contract");
    expect(entry.secondaryText).toBe("Interacted");
    expect(entry.rowIcon).toEqual({ type: "contract" });
    expect(entry.details.balanceChanges).toHaveLength(0);
    expect(entry.details.contractId).toBe(MOCK_USDC_SAC);
  });

  it("maps a received payment with its counterparty", () => {
    const entry = mapV2Transaction(mockPaymentReceived, ctx);

    expect(entry.kind).toBe("received");
    expect(entry.primaryText).toBe("USDC");
    expect(entry.secondaryText).toBe("Received");
    expect(entry.amounts).toEqual([
      { text: "+40.4 USDC", direction: "credit" },
    ]);
    expect(entry.details.title).toBe("Received USDC");
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
  });

  it("maps a sent payment with its counterparty", () => {
    const entry = mapV2Transaction(mockPaymentSent, ctx);

    expect(entry.kind).toBe("sent");
    expect(entry.primaryText).toBe("XLM");
    expect(entry.amounts).toEqual([{ text: "-100 XLM", direction: "debit" }]);
    expect(entry.details.title).toBe("Sent XLM");
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
  });

  it("maps a SEP-41 token transfer with the transfer destination", () => {
    const entry = mapV2Transaction(mockTokenTransferSent, ctx);

    expect(entry.kind).toBe("sent");
    expect(entry.details.functionName).toBe("transfer");
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
    expect(entry.amounts).toEqual([{ text: "-40.4 USDC", direction: "debit" }]);
  });

  it("maps a trustline added", () => {
    const entry = mapV2Transaction(mockTrustlineAdded, ctx);

    expect(entry.kind).toBe("trustlineAdded");
    expect(entry.primaryText).toBe("USDC");
    expect(entry.secondaryText).toBe("Added trustline");
    expect(entry.amounts).toBeNull();
    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "trustlines",
        verb: "created",
        entries: [
          {
            token: tokens.get(MOCK_USDC_SAC),
            limitOld: null,
            limitNew: "922337203685.4775807",
          },
        ],
      },
    ]);
  });

  it("groups multiple trustline changes by verb", () => {
    const entry = mapV2Transaction(mockTrustlineMulti, ctx);
    const cards = entry.details.stateChangeCards;

    expect(cards.map((c) => c.kind)).toEqual([
      "trustlines",
      "trustlines",
      "trustlines",
    ]);
    expect(cards).toEqual([
      expect.objectContaining({ verb: "created" }),
      expect.objectContaining({
        verb: "updated",
        entries: [
          expect.objectContaining({
            limitOld: "1000.0000000",
            limitNew: "10000.0000000",
          }),
        ],
      }),
      expect.objectContaining({ verb: "removed" }),
    ]);
  });

  it("maps account created with funder, starting balance, and sponsorship", () => {
    const entry = mapV2Transaction(mockAccountCreated, ctx);

    // the starting-balance credit drives the row
    expect(entry.kind).toBe("received");
    expect(entry.amounts).toEqual([{ text: "+5 XLM", direction: "credit" }]);
    expect(entry.details.stateChangeCards).toEqual([
      { kind: "accountCreated", address: MOCK_SELF, funder: MOCK_EXTERNAL },
      {
        kind: "reserves",
        verb: "sponsored",
        sponsor: MOCK_EXTERNAL,
        sponsored: MOCK_SELF,
        detail: null,
      },
    ]);
  });

  it("maps account merged", () => {
    const entry = mapV2Transaction(mockAccountMerged, ctx);

    expect(entry.kind).toBe("received");
    expect(entry.amounts).toEqual([
      { text: "+123.45 XLM", direction: "credit" },
    ]);
    expect(entry.details.stateChangeCards).toEqual([{ kind: "accountMerged" }]);
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
  });

  it("maps a single signer added", () => {
    const entry = mapV2Transaction(mockSignerAdded, ctx);

    expect(entry.kind).toBe("other");
    expect(entry.primaryText).toBe("Signers");
    expect(entry.secondaryText).toBe("Signer added");
    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "signers",
        verb: "added",
        entries: [{ address: MOCK_ACCOUNT_2, weightOld: null, weightNew: 1 }],
      },
    ]);
  });

  it("groups multiple signer changes by verb, alongside a balance movement", () => {
    const entry = mapV2Transaction(mockSignerMulti, ctx);

    // the XLM debit drives the row
    expect(entry.kind).toBe("sent");
    expect(entry.amounts).toEqual([{ text: "-40 XLM", direction: "debit" }]);
    expect(entry.details.stateChangeCards).toEqual([
      expect.objectContaining({ kind: "signers", verb: "added" }),
      expect.objectContaining({
        kind: "signers",
        verb: "updated",
        entries: [expect.objectContaining({ weightOld: 1, weightNew: 2 })],
      }),
      expect.objectContaining({
        kind: "signers",
        verb: "removed",
        entries: [expect.objectContaining({ weightOld: 1, weightNew: null })],
      }),
    ]);
  });

  it("maps a threshold change with old → new values", () => {
    const entry = mapV2Transaction(mockThresholdsChange, ctx);

    expect(entry.details.stateChangeCards).toEqual([
      { kind: "thresholds", level: "medium", valueOld: "2", valueNew: "3" },
    ]);
  });

  it("maps a data entry added", () => {
    const entry = mapV2Transaction(mockDataEntryAdded, ctx);

    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "dataEntry",
        verb: "added",
        key: "hair_color",
        valueOldB64: null,
        valueNewB64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
      },
    ]);
  });

  it("maps multiple data entries with added/updated/removed verbs", () => {
    const entry = mapV2Transaction(mockDataEntryMulti, ctx);
    const cards = entry.details.stateChangeCards;

    expect(cards).toEqual([
      expect.objectContaining({ verb: "added", key: "hair_color" }),
      expect.objectContaining({
        verb: "updated",
        key: "eye_color",
        valueOldB64: "Ymx1ZQ==",
        valueNewB64: "Z3JlZW4=",
      }),
      expect.objectContaining({ verb: "removed", key: "shoe_size" }),
    ]);
  });

  it("maps a home domain update", () => {
    const entry = mapV2Transaction(mockHomeDomainUpdated, ctx);

    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "homeDomain",
        verb: "updated",
        domainOld: "stellar.org",
        domainNew: "stellar.com",
      },
    ]);
  });

  it("merges flag SET and CLEAR into one card", () => {
    const entry = mapV2Transaction(mockFlagsChanged, ctx);

    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "flags",
        set: ["auth_revocable"],
        cleared: ["auth_clawback_enabled"],
      },
    ]);
  });

  it("groups balance authorizations by direction", () => {
    const entry = mapV2Transaction(mockBalanceAuthChanged, ctx);

    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "balanceAuthorizations",
        authorized: true,
        tokens: [tokens.get(MOCK_USDC_SAC)],
      },
      {
        kind: "balanceAuthorizations",
        authorized: false,
        tokens: [tokens.get(MOCK_EURC_SAC)],
      },
    ]);
  });

  it("maps a sponsorship", () => {
    const entry = mapV2Transaction(mockReservesSponsored, ctx);

    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "reserves",
        verb: "sponsored",
        sponsor: MOCK_SELF,
        sponsored: MOCK_ACCOUNT_2,
        detail: null,
      },
    ]);
  });

  it("maps a failed transaction", () => {
    const entry = mapV2Transaction(mockFailedTransaction, ctx);

    expect(entry.kind).toBe("failed");
    expect(entry.primaryText).toBe("Transaction failed");
    expect(entry.secondaryIcon).toBe("failed");
    expect(entry.details.status).toBe("failed");
    expect(entry.details.title).toBe("Transaction failed");
    expect(entry.details.fee).toBe("0.0051234");
  });

  it("maps every fixture without throwing and with a populated presentation", () => {
    for (const tx of mockHistoryTransactions) {
      const entry = mapV2Transaction(tx, ctx);
      expect(entry.id).toBe(tx.hash);
      expect(entry.primaryText).toBeTruthy();
      expect(entry.details.title).toBeTruthy();
      expect(entry.details.operations.length).toBeGreaterThan(0);
    }
  });
});
