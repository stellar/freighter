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
  mockHomeDomainUpdated,
  mockPaymentReceived,
  mockPaymentSent,
  mockSponsorshipOperation,
  mockAllowanceApproved,
  mockSignerAdded,
  mockSignerMulti,
  mockSwapClassicDex,
  mockSwapViaContract,
  mockThresholdsChange,
  mockTokenTransferSent,
  mockTrustlineAdded,
  mockTrustlineMulti,
  mockScenarioTransactions,
} from "@shared/api/fixtures/history-v2-scenarios";
import {
  MOCK_SELF as REAL_ACCOUNT,
  MOCK_XLM_SAC as REAL_XLM_SAC,
  MOCK_YUSDC_SAC as REAL_YUSDC_SAC,
  MOCK_BLND_SAC as REAL_BLND_SAC,
  MOCK_CETES_SAC as REAL_CETES_SAC,
  mockHistoryTransactions,
} from "@shared/api/fixtures/history-v2";
import { ResolvedToken } from "popup/views/AccountHistory/model";
import { TokenContext } from "popup/helpers/history/tokenResolver";
import { collectTokenIds, mapV2Transaction, MapV2Context } from "../index";
import { buildPresentation } from "../classify";

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
    const ids = collectTokenIds(mockScenarioTransactions);
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

  it("maps account created with funder and starting balance", () => {
    const entry = mapV2Transaction(mockAccountCreated, ctx);

    // the starting-balance credit drives the row
    expect(entry.kind).toBe("received");
    expect(entry.amounts).toEqual([{ text: "+5 XLM", direction: "credit" }]);
    expect(entry.details.stateChangeCards).toEqual([
      { kind: "accountCreated", address: MOCK_SELF, funder: MOCK_EXTERNAL },
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

    expect(entry.primaryText).toBe("Contract");
    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "dataEntry",
        verb: "added",
        entries: [
          {
            key: "hair_color",
            valueOldB64: null,
            valueNewB64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
          },
        ],
      },
    ]);
  });

  it("maps multiple data entries with added/updated/removed verbs", () => {
    const entry = mapV2Transaction(mockDataEntryMulti, ctx);
    const cards = entry.details.stateChangeCards;

    // The tx is a contract invocation, so the row is titled by the contract —
    // the data entries are supporting cards, not the row's identity
    expect(entry.kind).toBe("contract");
    expect(entry.primaryText).toBe("Contract");
    expect(entry.details.title).toBe("Contract");

    // one card per verb, in added → updated → removed order
    expect(cards).toEqual([
      expect.objectContaining({
        verb: "added",
        entries: [expect.objectContaining({ key: "hair_color" })],
      }),
      expect.objectContaining({
        verb: "updated",
        entries: [
          {
            key: "eye_color",
            valueOldB64: "Ymx1ZQ==",
            valueNewB64: "Z3JlZW4=",
          },
        ],
      }),
      expect.objectContaining({
        verb: "removed",
        entries: [expect.objectContaining({ key: "shoe_size" })],
      }),
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
        set: ["AUTH_REVOCABLE"],
        cleared: ["AUTH_CLAWBACK_ENABLED"],
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

  // Upstream stopped indexing sponsorship reserve changes, so the operation
  // carries no state changes of its own.
  it("maps a sponsorship operation with no state changes", () => {
    const entry = mapV2Transaction(mockSponsorshipOperation, ctx);

    expect(entry.details.stateChangeCards).toEqual([]);
    expect(entry.details.operations).toHaveLength(1);
    // nothing to describe but the operation itself
    expect(entry.primaryText).toBe("Sponsorship");
    expect(entry.secondaryText).toBe("Submitted");
  });

  it("maps an allowance approval", () => {
    const entry = mapV2Transaction(mockAllowanceApproved, ctx);

    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "allowance",
        token: tokens.get(MOCK_USDC_SAC),
        spender: MOCK_ROUTER_CONTRACT,
        amount: "100",
        expirationLedger: 51_530_000,
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

  it("suppresses the protocol-action overlay when the transaction failed", () => {
    // buildPresentation must not relabel a failed row even when a protocol
    // action was resolved for it — failed suppresses the overlay entirely.
    const entry = buildPresentation({
      classification: { type: "none" },
      cards: [],
      contractCall: null,
      protocol: null,
      failed: true,
      operationTypes: [],
      protocolAction: { label: "Claimed emissions", protocolName: "Blend" },
    });

    expect(entry.kind).toBe("failed");
    expect(entry.primaryText).toBe("Transaction failed");
    expect(entry.secondaryText).toBe("Failed");
    expect(entry.secondaryIcon).toBe("failed");
    expect(entry.title).toBe("Transaction failed");
  });

  it("maps every fixture without throwing and with a populated presentation", () => {
    for (const tx of mockScenarioTransactions) {
      const entry = mapV2Transaction(tx, ctx);
      expect(entry.id).toBe(tx.hash);
      expect(entry.primaryText).toBeTruthy();
      expect(entry.details.title).toBeTruthy();
      expect(entry.details.operations.length).toBeGreaterThan(0);
    }
  });
});

/**
 * Amounts arrive as smallest-unit integers with no scale, so the resolved token's
 * decimals are the only thing that makes them meaningful — and a token whose
 * scale we could not resolve must not be rendered as though it were 7.
 */
describe("token scale", () => {
  const withUsdc = (token: ResolvedToken): MapV2Context => ({
    ...ctx,
    tokens: new Map([...tokens, [MOCK_USDC_SAC, token]]),
  });

  it("scales an amount by the token's own decimals", () => {
    const raw = { ...token("USDC", MOCK_USDC_SAC), decimals: 18 };
    const entry = mapV2Transaction(
      mockTokenTransferSent,
      withUsdc(raw as ResolvedToken),
    );

    // 404000000 at 18 decimals, not the 40.4 that 7 decimals would give
    expect(entry.details.balanceChanges[0].amount).toBe("0.000000000404");
    expect(entry.amounts).toEqual([
      { text: "-0.000000000404 USDC", direction: "debit" },
    ]);
  });

  it("reports no amount when the token's scale is unknown", () => {
    const unscaled = { ...token("USDC", MOCK_USDC_SAC), decimals: null };
    const entry = mapV2Transaction(mockTokenTransferSent, withUsdc(unscaled));

    expect(entry.details.balanceChanges[0].amount).toBeNull();
    // em dash, not a number derived from a guessed scale
    expect(entry.amounts).toEqual([{ text: "— USDC", direction: "debit" }]);
  });

  it("omits the swap rate when one side's scale is unknown", () => {
    const unscaled = { ...token("USDC", MOCK_USDC_SAC), decimals: null };
    const entry = mapV2Transaction(mockSwapClassicDex, withUsdc(unscaled));

    // still recognizably a swap, just without a computable ratio
    expect(entry.kind).toBe("swapped");
    expect(entry.details.rate).toBeNull();
  });
});

/**
 * The mocked app history is a real capture (see history-v2.ts). These guard the
 * wire quirks that only real data exposes — they are the reason the fixture was
 * rebuilt from a live account.
 */
describe("real captured history", () => {
  const realTokens: TokenContext = new Map([
    [REAL_XLM_SAC, token("XLM", REAL_XLM_SAC)],
    [REAL_YUSDC_SAC, token("yUSDC", REAL_YUSDC_SAC)],
    [REAL_BLND_SAC, token("BLND", REAL_BLND_SAC)],
    [REAL_CETES_SAC, token("CETES", REAL_CETES_SAC)],
  ]);
  const realCtx: MapV2Context = {
    tokens: realTokens,
    publicKey: REAL_ACCOUNT,
    nativeTokenId: REAL_XLM_SAC,
  };
  const rows = () =>
    mockHistoryTransactions.map((tx) => mapV2Transaction(tx, realCtx));

  it("keeps the real wire encodings", () => {
    for (const tx of mockHistoryTransactions) {
      expect(tx.operations.length).toBeGreaterThan(0);
      expect(tx.result_code.endsWith("Success")).toBe(true);
      expect(tx.hash).toMatch(/^[0-9a-f]{64}$/);
      for (const change of tx.state_changes) {
        if ("token_id" in change && change.token_id) {
          expect(change.token_id).toMatch(/^C[A-Z2-7]{55}$/);
        }
      }
    }
  });

  it("maps every real transaction to a populated row", () => {
    for (const tx of mockHistoryTransactions) {
      const entry = mapV2Transaction(tx, realCtx);
      expect(entry.id).toBe(tx.hash);
      expect(entry.primaryText).toBeTruthy();
      expect(entry.details.title).toBeTruthy();
      expect(entry.details.operations.length).toBeGreaterThan(0);
    }
  });

  it("renders the multi-op swap-with-trustline transaction", () => {
    // 2026-07-14: CHANGE_TRUST + PATH_PAYMENT_STRICT_SEND in one transaction
    const tx = mockHistoryTransactions.find(
      (candidate) =>
        candidate.operations.some(
          (op) => op.operation_type === "PATH_PAYMENT_STRICT_SEND",
        ) &&
        candidate.operations.some((op) => op.operation_type === "CHANGE_TRUST"),
    )!;
    const entry = mapV2Transaction(tx, realCtx);

    expect(entry.kind).toBe("swapped");
    expect(entry.details.stateChangeCards).toEqual([
      expect.objectContaining({ kind: "trustlines", verb: "created" }),
    ]);
    // the XLM debit and the fee are both XLM; only the debit is a balance row
    expect(entry.details.balanceChanges).toHaveLength(2);
    expect(entry.details.fee).toBe("0.00002");
  });

  it("labels the Blend claims with the protocol action", () => {
    const claims = rows().filter((entry) =>
      entry.amounts !== "multiple"
        ? (entry.amounts ?? []).some((a) => a.text.endsWith("BLND")) &&
          entry.details.functionName !== null
        : false,
    );

    expect(claims).toHaveLength(3);
    for (const claim of claims) {
      // the overlay replaces only the labels: kind and amounts are untouched
      expect(claim.kind).toBe("received");
      expect(claim.primaryText).toBe("Claimed emissions");
      expect(claim.secondaryText).toBe("Blend");
      expect(claim.secondaryIcon).toBe("contract");
      expect(claim.details.title).toBe("Claimed emissions");
    }
  });

  it("leaves rows without a protocol state change untouched", () => {
    // A plain inbound payment has no BLEND_* row, so it keeps the asset-code
    // primary and the direction verb — this is the "preserve everything else"
    // guarantee, asserted directly rather than only via the other suites. The
    // feature's central promise is that the overlay touches only the label
    // fields, so kind/rowIcon/amounts must come through untouched too.
    const payment = mockHistoryTransactions.find(
      (tx) =>
        tx.operations.length > 0 &&
        tx.operations.every((op) => op.operation_type === "PAYMENT") &&
        !tx.state_changes.some((change) => change.type.startsWith("BLEND_")),
    )!;
    const entry = mapV2Transaction(payment, realCtx);

    expect(entry.primaryText).not.toBe("Claimed emissions");
    expect(entry.secondaryText).toBe("Received");
    expect(entry.kind).toBe("received");
    expect(entry.rowIcon).toEqual({
      type: "asset",
      tokens: [realTokens.get(REAL_YUSDC_SAC)],
    });
    expect(entry.amounts).toEqual([
      { text: "+0.0000086 yUSDC", direction: "credit" },
    ]);
  });

  /**
   * A Blend claim carries a `BlendEmissionsClaimChange` alongside the generic
   * BalanceChange for the same movement — the two are additive, not a
   * replacement. The UI reads the Blend row for the protocol-action label, but it
   * must never double-count into a second amount row or a state-change card.
   */
  it("does not double-count the Blend row against the balance change", () => {
    const claims = mockHistoryTransactions.filter((tx) =>
      tx.state_changes.some(
        (change) => change.variant === "BlendEmissionsClaimChange",
      ),
    );
    expect(claims).toHaveLength(3);

    for (const tx of claims) {
      const blend = tx.state_changes.find(
        (change) => change.variant === "BlendEmissionsClaimChange",
      )!;
      if (blend.variant !== "BlendEmissionsClaimChange") {
        throw new Error("unreachable");
      }
      // the Blend row restates the CREDIT's token and amount verbatim
      const credit = tx.state_changes.find(
        (change) =>
          change.variant === "BalanceChange" && change.reason === "CREDIT",
      )!;
      expect(blend.amount).toBe(
        credit.variant === "BalanceChange" ? credit.amount : null,
      );
      expect(blend.token_id).toBe(REAL_BLND_SAC);
      expect(blend.pool_id).toMatch(/^C[A-Z2-7]{55}$/);

      const entry = mapV2Transaction(tx, realCtx);
      // one BLND row, not two, and the Blend row produces no card
      expect(entry.details.balanceChanges).toHaveLength(1);
      expect(entry.amounts).toEqual([
        expect.objectContaining({ direction: "credit" }),
      ]);
      expect(entry.details.stateChangeCards).toEqual([]);
    }
  });

  it("names claimable-balance airdrops after the operation", () => {
    // This account is only a claimant, so upstream reports no state change at
    // all until the balance is claimed — the operation type is all the row has
    // to go on.
    const airdrops = mockHistoryTransactions.filter((tx) =>
      tx.operations.some(
        (op) => op.operation_type === "CREATE_CLAIMABLE_BALANCE",
      ),
    );

    expect(airdrops.length).toBeGreaterThan(0);
    const claimantOnly = airdrops.filter((tx) => tx.state_changes.length === 0);
    expect(claimantOnly).toHaveLength(2);
    for (const tx of claimantOnly) {
      const entry = mapV2Transaction(tx, realCtx);
      expect(entry.kind).toBe("other");
      expect(entry.primaryText).toBe("Claimable balance created");
      expect(entry.secondaryText).toBe("Pending claim");
      expect(entry.rowIcon).toEqual({ type: "settings", glyph: "claimable" });
      expect(entry.details.title).toBe("Claimable balance created");
      expect(entry.amounts).toBeNull();
    }
  });

  it("carries dust in both native and non-native flavors", () => {
    const dust = rows().filter(
      (entry) =>
        entry.amounts !== "multiple" &&
        (entry.amounts ?? []).some(
          (a) => a.text.startsWith("+0.000") && a.direction === "credit",
        ),
    );

    // 12 recurring yUSDC payouts + 7 one-stroop XLM credits. Only the XLM ones
    // are hidden by the dust filter, which is native-only (see helpers/history/filters).
    expect(dust.filter((e) => e.primaryText === "yUSDC")).toHaveLength(12);
    expect(dust.filter((e) => e.primaryText === "XLM")).toHaveLength(7);
  });
});
