import {
  MOCK_ACCOUNT_2,
  MOCK_BLND_SAC,
  MOCK_EURC_SAC,
  MOCK_EXTERNAL,
  MOCK_ROUTER_CONTRACT,
  MOCK_SELF,
  MOCK_USDC_SAC,
  MOCK_XLM_SAC,
  mockAccountCreated,
  mockAccountMerged,
  mockBalanceAuthChanged,
  mockBlendEmissionsClaim,
  mockClaimableBalanceAirdrop,
  mockClaimableBalanceClaimed,
  mockClaimableBalanceCreatedBySelf,
  mockClassicBatch,
  mockHeterogeneousBatch,
  mockPathPaymentMultiRow,
  mockLpDeposit,
  mockLpWithdraw,
  mockOfferCrossed,
  mockContractMultiAsset,
  mockContractNoBalanceChange,
  mockDataEntryAdded,
  mockDataEntryMulti,
  mockFailedTransaction,
  mockFlagsChanged,
  mockHomeDomainUpdated,
  mockPaymentReceived,
  mockPaymentReceivedMuxed,
  mockPaymentSent,
  mockSponsorshipOperation,
  mockAllowanceApproved,
  mockSignerAdded,
  mockSignerMulti,
  mockSwapClassicDex,
  mockSwapViaContract,
  mockThresholdsChange,
  mockTokenMintReceived,
  mockTokenMintToOther,
  mockTokenTransferReceived,
  mockTokenTransferReceivedMuxed,
  mockTokenTransferSent,
  mockTokenTransferSentMuxed,
  mockTokenTransferSentWithMuxedId,
  MOCK_MUXED_ACCOUNT_2,
  MOCK_MUXED_SELF,
  mockTrustlineAdded,
  mockTrustlineMulti,
  mockScenarioTransactions,
} from "popup/views/AccountHistory/__tests__/fixtures/historyV2Scenarios";
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
    // No protocol match yet — but the movement says what happened: the
    // classic pair treatment, whatever contract routed it.
    expect(entry.primaryText).toBe("XLM to USDC");
    expect(entry.secondaryText).toBe("Swapped");
    expect(entry.rowIcon.type).toBe("asset");
    expect(entry.details.title).toBe("Swapped XLM to USDC");
    expect(entry.details.contractId).toBe(MOCK_ROUTER_CONTRACT);
    expect(entry.details.functionName).toBe("swap");
    expect(entry.details.protocol).toBeNull();
    expect(entry.details.rate).toBe("1 XLM ≈ 1.01 USDC");
  });

  it("maps a multi-asset contract call to 'Multiple'", () => {
    const entry = mapV2Transaction(mockContractMultiAsset, ctx);

    expect(entry.kind).toBe("contract");
    expect(entry.amounts).toBe("multiple");
    // multi-asset movement has no single identity and invocation names stay
    // in the detail sheet — generic by design
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
    // fee-only, so no movement to describe — generic by design (invocation
    // names stay in the detail sheet)
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
    // a SEP-41 transfer IS a payment — identical row to the classic treatment
    expect(entry.primaryText).toBe("USDC");
    expect(entry.secondaryText).toBe("Sent");
    expect(entry.rowIcon.type).toBe("asset");
    expect(entry.details.title).toBe("Sent USDC");
  });

  it("maps an INCOMING SEP-41 transfer with the sender as counterparty, never self", () => {
    const entry = mapV2Transaction(mockTokenTransferReceived, ctx);

    expect(entry.kind).toBe("received");
    expect(entry.details.functionName).toBe("transfer");
    // The regression this guards: the counterparty used to short-circuit on
    // the transfer's `to` arg with no publicKey comparison, so a received
    // transfer rendered "From: <the user's own address>".
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
    expect(entry.details.counterparty).not.toBe(MOCK_SELF);
    expect(entry.amounts).toEqual([
      { text: "+40.4 USDC", direction: "credit" },
    ]);
    // the incoming half of the same rule: renders like a received payment
    expect(entry.primaryText).toBe("USDC");
    expect(entry.secondaryText).toBe("Received");
  });

  it("maps a SEP-41 mint to self with no counterparty (a mint has no sender)", () => {
    const entry = mapV2Transaction(mockTokenMintReceived, ctx);

    expect(entry.kind).toBe("received");
    expect(entry.details.functionName).toBe("mint");
    // mint(to, amount) has two args — getArgsForTokenInvocation used to read
    // args[2] unconditionally and throw, silently degrading every mint.
    expect(entry.details.counterparty).toBeNull();
    expect(entry.amounts).toEqual([
      { text: "+40.4 USDC", direction: "credit" },
    ]);
    // state changes drive: a mint's credit renders like a received payment
    // (invocation names stay in the detail sheet)
    expect(entry.primaryText).toBe("USDC");
    expect(entry.secondaryText).toBe("Received");
  });

  it("maps the admin's mint to another account with the recipient as counterparty", () => {
    const entry = mapV2Transaction(mockTokenMintToOther, ctx);

    expect(entry.details.functionName).toBe("mint");
    // The recipient at args[0]. Unlike mint-to-self (counterparty null either
    // way), this is only reachable when the 2-arg mint actually decodes — the
    // mapper-level guard on the old unconditional-args[2] throw.
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
  });

  it("maps an incoming transfer addressed to the muxed form of self by base account", () => {
    const entry = mapV2Transaction(mockTokenTransferReceivedMuxed, ctx);

    expect(entry.kind).toBe("received");
    // The `to` arg is MOCK_MUXED_SELF (scAddressTypeMuxedAccount). A bare ===
    // against the G key misreads this as outgoing and returns the user's own
    // M-address as counterparty. Also proves the to_muxed_id upgrade is NOT
    // applied when the counterparty is the sender.
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
    expect(entry.details.counterparty).not.toBe(MOCK_MUXED_SELF);
  });

  it("keeps the muxed recipient verbatim on an outgoing transfer", () => {
    const entry = mapV2Transaction(mockTokenTransferSentMuxed, ctx);

    expect(entry.kind).toBe("sent");
    // Display preserves the M-address the user actually targeted.
    expect(entry.details.counterparty).toBe(MOCK_MUXED_ACCOUNT_2);
  });

  it("reconstructs the muxed recipient from to_muxed_id when the arg decoded bare (first consumer of the field)", () => {
    const entry = mapV2Transaction(mockTokenTransferSentWithMuxedId, ctx);

    expect(entry.kind).toBe("sent");
    // Bare-G `to` arg + to_muxed_id on the balance change → the CAP-67
    // reconstruction MCFI...(MOCK_ACCOUNT_2, 67890).
    expect(entry.details.counterparty).toBe(MOCK_MUXED_ACCOUNT_2);
  });

  it("maps a classic payment received at the muxed form of self with the sender as counterparty", () => {
    const entry = mapV2Transaction(mockPaymentReceivedMuxed, ctx);

    expect(entry.kind).toBe("received");
    // decodeCounterparty's destination comparison must normalize the muxed
    // destination to its base account; the counterparty is the op source.
    expect(entry.details.counterparty).toBe(MOCK_ACCOUNT_2);
    expect(entry.details.counterparty).not.toBe(MOCK_MUXED_SELF);
  });

  it("suppresses the companion balance-authorization change on a trustline event, but keeps standalone ones", () => {
    // Creating a trustline against a default-auth issuer emits a
    // BalanceAuthorizationChange(SET) companion; the design's trustline frame
    // shows only the trustline card, so the companion must not become a
    // second "Balance Authorized" card (mockTrustlineAdded carries it).
    const trustline = mapV2Transaction(mockTrustlineAdded, ctx);
    expect(
      trustline.details.stateChangeCards.filter(
        (card) => card.kind === "balanceAuthorizations",
      ),
    ).toHaveLength(0);

    // ...while an issuer's own SET_TRUST_LINE_FLAGS tx (no trustline change
    // in it) still renders the authorization card.
    const standalone = mapV2Transaction(mockBalanceAuthChanged, ctx);
    expect(
      standalone.details.stateChangeCards.filter(
        (card) => card.kind === "balanceAuthorizations",
      ),
    ).not.toHaveLength(0);
  });

  it("labels an LP deposit by its operation, never as Contract", () => {
    const entry = mapV2Transaction(mockLpDeposit, ctx);

    // Two same-direction debits "look like" a generic multi-asset contract
    // call — the regression that drove op-type-first dispatch. The op says
    // what it is.
    expect(entry.primaryText).toBe("Liquidity pool deposit");
    expect(entry.primaryText).not.toBe("Contract");
    expect(entry.secondaryText).toBe("Submitted");
    expect(entry.kind).toBe("other");
    // two assets moved → the Multiple label, never stacked amounts; the
    // per-asset breakdown is the detail sheet's job
    expect(entry.amounts).toBe("multiple");
    expect(entry.rowIcon).toEqual({
      type: "asset",
      tokens: [tokens.get(MOCK_XLM_SAC), tokens.get(MOCK_USDC_SAC)],
    });
    expect(entry.details.title).toBe("Liquidity pool deposit");
  });

  it("labels an LP withdrawal by its operation", () => {
    const entry = mapV2Transaction(mockLpWithdraw, ctx);

    expect(entry.primaryText).toBe("Liquidity pool withdrawal");
    expect(entry.amounts).toBe("multiple");
  });

  it("labels a claim as claimed, not as a received payment", () => {
    const entry = mapV2Transaction(mockClaimableBalanceClaimed, ctx);

    expect(entry.primaryText).toBe("Claimable balance claimed");
    expect(entry.secondaryText).toBe("Claimed");
    // kind stays shape-behavioral (dust filtering, sheet direction) — only
    // the labels are op-driven.
    expect(entry.kind).toBe("received");
    expect(entry.amounts).toEqual([
      { text: "+40.4 USDC", direction: "credit" },
    ]);
  });

  it("labels the creator side of a claimable balance as created, not as Sent", () => {
    const entry = mapV2Transaction(mockClaimableBalanceCreatedBySelf, ctx);

    expect(entry.primaryText).toBe("Claimable balance created");
    expect(entry.secondaryText).toBe("Pending claim");
    // The escrowed debit is a sheet detail, not the row's identity — nothing
    // has been received by anyone yet.
    expect(entry.amounts).toBeNull();
    expect(entry.details.balanceChanges).toHaveLength(1);
    expect(entry.details.balanceChanges[0].direction).toBe("debit");
  });

  it("labels a crossed offer as Offer, not as a swap", () => {
    const entry = mapV2Transaction(mockOfferCrossed, ctx);

    expect(entry.primaryText).toBe("Offer");
    expect(entry.secondaryText).toBe("Submitted");
    expect(entry.kind).toBe("other");
    // two assets filled → the Multiple label, not stacked amounts
    expect(entry.amounts).toBe("multiple");
  });

  it("labels a homogeneous payment batch by its operation — never a swap pair, never Contract", () => {
    const entry = mapV2Transaction(mockClassicBatch, ctx);

    // One debit + one credit is exactly a swap's shape, but the ops are two
    // ordinary payments, and homogeneous ops name themselves.
    expect(entry.primaryText).toBe("Payment");
    expect(entry.secondaryText).toBe("Multiple balance changes");
    expect(entry.kind).toBe("other");
    expect(entry.amounts).toBe("multiple");
  });

  it("labels a multi-row path payment as Path payment, never the generic Transaction", () => {
    const entry = mapV2Transaction(mockPathPaymentMultiRow, ctx);

    expect(entry.primaryText).toBe("Path payment");
    expect(entry.secondaryText).toBe("Multiple balance changes");
    expect(entry.amounts).toBe("multiple");
  });

  it("reserves the Transaction label for genuinely heterogeneous classic batches", () => {
    const entry = mapV2Transaction(mockHeterogeneousBatch, ctx);

    // PAYMENT + LIQUIDITY_POOL_DEPOSIT in one tx: no single operation
    // identity exists, so — and only so — the generic label is honest.
    expect(entry.primaryText).toBe("Transaction");
    expect(entry.secondaryText).toBe("Multiple balance changes");
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
 * Protocol state changes are ADDITIVE: a Blend emissions claim reports its BLND
 * twice — once as a BalanceChange CREDIT and once as a
 * BlendEmissionsClaimChange (see `@shared/api/types/blend.ts`). The overlay
 * must relabel the row and touch nothing else.
 */
describe("protocol actions over a whole transaction", () => {
  const withBlnd: MapV2Context = {
    ...ctx,
    tokens: new Map([...tokens, [MOCK_BLND_SAC, token("BLND", MOCK_BLND_SAC)]]),
  };

  it("labels a Blend claim without double-counting the BLND", () => {
    const entry = mapV2Transaction(mockBlendEmissionsClaim, withBlnd);

    // the overlay replaces only the labels: kind and amounts are untouched
    expect(entry.kind).toBe("received");
    expect(entry.primaryText).toBe("Claimed emissions");
    expect(entry.secondaryText).toBe("Blend");
    expect(entry.secondaryIcon).toBe("contract");
    expect(entry.details.title).toBe("Claimed emissions");
    expect(entry.details.functionName).toBe("claim");

    // one BLND row, not two, and the Blend row produces no state-change card
    expect(entry.details.balanceChanges).toHaveLength(1);
    expect(entry.amounts).toEqual([
      { text: "+0.101548 BLND", direction: "credit" },
    ]);
    expect(entry.details.stateChangeCards).toEqual([]);
  });

  it("leaves a row without a protocol state change untouched", () => {
    // The feature's central promise is that the overlay touches only the label
    // fields, so a plain inbound payment keeps the asset-code primary and the
    // direction verb.
    const entry = mapV2Transaction(mockPaymentReceived, ctx);

    expect(entry.primaryText).not.toBe("Claimed emissions");
    expect(entry.secondaryText).toBe("Received");
    expect(entry.kind).toBe("received");
  });
});

/**
 * When this account is only a claimant, upstream reports no state change at all
 * until the balance is claimed — the operation type is all the row has to go on.
 */
describe("claimant-only claimable balances", () => {
  it("names the row after the operation", () => {
    const entry = mapV2Transaction(mockClaimableBalanceAirdrop, ctx);

    expect(entry.kind).toBe("other");
    expect(entry.primaryText).toBe("Claimable balance created");
    expect(entry.secondaryText).toBe("Pending claim");
    expect(entry.rowIcon).toEqual({ type: "settings", glyph: "claimable" });
    expect(entry.details.title).toBe("Claimable balance created");
    expect(entry.amounts).toBeNull();
  });
});
