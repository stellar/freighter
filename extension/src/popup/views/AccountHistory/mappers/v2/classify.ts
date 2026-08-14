/**
 * Derives the list-row presentation (kind, texts, icon descriptor, amounts)
 * and the detail title from the mapped balance classification + state-change
 * cards. All user-facing strings are centralized here so design/i18n
 * adjustments stay one-file changes (wrapped by the UI layer's t()).
 */

import { V2OperationType } from "@shared/api/types/backend-api";
import { formatAmount, trimTrailingZeros } from "popup/helpers/formatters";
import i18n from "popup/helpers/localizationConfig";
import {
  BalanceChangeRow,
  HistoryEntry,
  ProtocolInfo,
  ResolvedToken,
  RowIconDescriptor,
  StateChangeCardData,
} from "popup/views/AccountHistory/model";
import { BalanceClassification } from "./balances";
import { ProtocolAction } from "./protocolActions";

type Presentation = Pick<
  HistoryEntry,
  | "kind"
  | "rowIcon"
  | "primaryText"
  | "secondaryText"
  | "secondaryIcon"
  | "amounts"
> & { title: string };

/**
 * An unknown token scale leaves the magnitude unknowable, so the row shows an em
 * dash with the token code — the direction still colors it credit/debit.
 */
const signedAmount = (row: BalanceChangeRow) => ({
  text:
    row.amount === null
      ? `— ${row.token.code}`
      : `${row.direction === "credit" ? "+" : "-"}${trimTrailingZeros(
          formatAmount(row.amount),
        )} ${row.token.code}`,
  direction: row.direction,
});

const distinctTokens = (rows: BalanceChangeRow[]): ResolvedToken[] => {
  const seen = new Map<string, ResolvedToken>();
  for (const row of rows) {
    const key = row.token.contractId ?? row.token.code;
    if (!seen.has(key)) {
      seen.set(key, row.token);
    }
  }
  return [...seen.values()];
};

/**
 * Sentence-case labels for the operation types that can reach the fallback
 * below. The v1 list used constants/transaction's Title Case names; the
 * redesign's rows are sentence case ("Added trustline", "Data entry added").
 */
// A full Record, deliberately: every classic operation names itself, so no
// classic operation can ever fall back to a generic "Transaction" label — and
// a new wire operation type fails to compile until it gets one. Most of these
// only surface when a transaction reaches the fallbacks (no movement and no
// state change, or a homogeneous multi-row shape); the common cases render
// through their families first (§3 of history-row-label-derivation.md).
const OPERATION_LABELS: Record<V2OperationType, string> = {
  CREATE_ACCOUNT: i18n.t("Account created"),
  PAYMENT: i18n.t("Payment"),
  PATH_PAYMENT_STRICT_RECEIVE: i18n.t("Path payment"),
  PATH_PAYMENT_STRICT_SEND: i18n.t("Path payment"),
  MANAGE_SELL_OFFER: i18n.t("Offer"),
  MANAGE_BUY_OFFER: i18n.t("Offer"),
  CREATE_PASSIVE_SELL_OFFER: i18n.t("Offer"),
  SET_OPTIONS: i18n.t("Account settings updated"),
  CHANGE_TRUST: i18n.t("Trustline updated"),
  ALLOW_TRUST: i18n.t("Trustline authorization"),
  SET_TRUST_LINE_FLAGS: i18n.t("Trustline authorization"),
  ACCOUNT_MERGE: i18n.t("Account merged"),
  INFLATION: i18n.t("Inflation"),
  MANAGE_DATA: i18n.t("Data entry updated"),
  BUMP_SEQUENCE: i18n.t("Sequence bumped"),
  CREATE_CLAIMABLE_BALANCE: i18n.t("Claimable balance created"),
  CLAIM_CLAIMABLE_BALANCE: i18n.t("Claimable balance claimed"),
  BEGIN_SPONSORING_FUTURE_RESERVES: i18n.t("Sponsorship"),
  END_SPONSORING_FUTURE_RESERVES: i18n.t("Sponsorship"),
  REVOKE_SPONSORSHIP: i18n.t("Sponsorship revoked"),
  CLAWBACK: i18n.t("Clawback"),
  CLAWBACK_CLAIMABLE_BALANCE: i18n.t("Claimable balance clawed back"),
  LIQUIDITY_POOL_DEPOSIT: i18n.t("Liquidity pool deposit"),
  LIQUIDITY_POOL_WITHDRAW: i18n.t("Liquidity pool withdrawal"),
  INVOKE_HOST_FUNCTION: i18n.t("Contract"),
  EXTEND_FOOTPRINT_TTL: i18n.t("Footprint extended"),
  RESTORE_FOOTPRINT: i18n.t("Footprint restored"),
};

/**
 * The single label a transaction's own operations agree on, or null when the
 * operations genuinely disagree (a heterogeneous batch has no one identity).
 * Distinct op types that share a label (the three offer ops, the two path
 * payments) still agree.
 */
const homogeneousOpLabel = (
  operationTypes: V2OperationType[],
): string | null => {
  const labels = new Set(
    operationTypes.map((type) => OPERATION_LABELS[type]).filter(Boolean),
  );
  return labels.size === 1 ? [...labels][0] : null;
};

/**
 * Row treatment for operations that move no balance and emit no state change
 * the account can be told about — a claimable balance it is only a claimant of
 * (the funds move on claim, not on creation), an offer, a sequence bump, a
 * footprint extension. Without this they would all read "Transaction".
 */
const operationPresentation = (
  type: V2OperationType | undefined,
): Pick<
  Presentation,
  "kind" | "primaryText" | "secondaryText" | "secondaryIcon" | "rowIcon"
> & { title: string } => {
  if (type === "CREATE_CLAIMABLE_BALANCE") {
    return {
      kind: "other",
      primaryText: i18n.t("Claimable balance created"),
      secondaryText: i18n.t("Pending claim"),
      secondaryIcon: null,
      rowIcon: { type: "settings", glyph: "claimable" },
      title: i18n.t("Claimable balance created"),
    };
  }

  const label = type ? OPERATION_LABELS[type] : undefined;
  return {
    kind: "other",
    primaryText: label ?? i18n.t("Transaction"),
    secondaryText: label ? i18n.t("Submitted") : i18n.t("Interacted"),
    secondaryIcon: null,
    rowIcon: { type: "contract" },
    title: label ?? i18n.t("Transaction"),
  };
};

/** Row treatment for pure config-change transactions (no balance movement) */
const configPresentation = (
  card: StateChangeCardData,
): Pick<
  Presentation,
  "kind" | "primaryText" | "secondaryText" | "secondaryIcon" | "rowIcon"
> & { title: string } => {
  switch (card.kind) {
    case "accountCreated":
      return {
        kind: "accountCreated",
        primaryText: i18n.t("Account created"),
        secondaryText: i18n.t("Created"),
        secondaryIcon: "add",
        rowIcon: { type: "account", variant: "create" },
        title: i18n.t("Account created"),
      };
    case "accountMerged":
      return {
        kind: "accountMerged",
        primaryText: i18n.t("Account merged"),
        secondaryText: i18n.t("Merged"),
        secondaryIcon: "remove",
        rowIcon: { type: "account", variant: "merge" },
        title: i18n.t("Account merged"),
      };
    case "trustlines": {
      const first = card.entries[0];
      const primaryText =
        card.entries.length === 1 ? first.token.code : i18n.t("Trustlines");
      if (card.verb === "removed") {
        return {
          kind: "trustlineRemoved",
          primaryText,
          secondaryText: i18n.t("Removed trustline"),
          secondaryIcon: "remove",
          rowIcon: { type: "asset", tokens: card.entries.map((e) => e.token) },
          title: i18n.t("Removed trustline"),
        };
      }
      return {
        kind: "trustlineAdded",
        primaryText,
        secondaryText:
          card.verb === "created"
            ? i18n.t("Added trustline")
            : i18n.t("Updated trustline"),
        secondaryIcon: "add",
        rowIcon: { type: "asset", tokens: card.entries.map((e) => e.token) },
        title:
          card.verb === "created"
            ? i18n.t("Added trustline")
            : i18n.t("Updated trustline"),
      };
    }
    case "signers":
      return {
        kind: "other",
        primaryText: i18n.t("Signers"),
        secondaryText: `${i18n.t("Signer")} ${card.verb}`,
        secondaryIcon: "settings",
        rowIcon: { type: "settings", glyph: "signer" },
        title: i18n.t("Signer change"),
      };
    case "thresholds":
      return {
        kind: "other",
        primaryText: i18n.t("Thresholds"),
        secondaryText: i18n.t("Threshold updated"),
        secondaryIcon: "settings",
        rowIcon: { type: "settings", glyph: "threshold" },
        title: i18n.t("Threshold updated"),
      };
    case "dataEntry":
      return {
        kind: "other",
        primaryText: i18n.t("Data entry"),
        secondaryText: `${i18n.t("Data entry")} ${card.verb}`,
        secondaryIcon: "settings",
        rowIcon: { type: "settings", glyph: "data" },
        title: `${i18n.t("Data entry")} ${card.verb}`,
      };
    case "homeDomain":
      return {
        kind: "other",
        primaryText: i18n.t("Home domain"),
        secondaryText: `${i18n.t("Home domain")} ${card.verb}`,
        secondaryIcon: "settings",
        rowIcon: { type: "settings", glyph: "domain" },
        title: `${i18n.t("Home domain")} ${card.verb}`,
      };
    case "flags":
      return {
        kind: "other",
        primaryText: i18n.t("Account settings"),
        secondaryText: i18n.t("Setting updated"),
        secondaryIcon: "settings",
        rowIcon: { type: "settings", glyph: "flag" },
        title: i18n.t("Account setting updated"),
      };
    case "balanceAuthorizations":
      return {
        kind: "other",
        primaryText:
          card.tokens.length === 1 ? card.tokens[0].code : i18n.t("Trustlines"),
        secondaryText: card.authorized
          ? i18n.t("Balance authorized")
          : i18n.t("Balance unauthorized"),
        secondaryIcon: "settings",
        rowIcon: { type: "asset", tokens: card.tokens },
        title: card.authorized
          ? i18n.t("Balance authorized")
          : i18n.t("Balance unauthorized"),
      };
    case "allowance":
      return {
        kind: "other",
        primaryText: card.token.code,
        secondaryText: i18n.t("Allowance approved"),
        secondaryIcon: "settings",
        rowIcon: { type: "settings", glyph: "allowance" },
        title: i18n.t("Allowance approved"),
      };
    default:
      return {
        kind: "other",
        primaryText: i18n.t("Transaction"),
        secondaryText: i18n.t("Interacted"),
        secondaryIcon: null,
        rowIcon: { type: "settings", glyph: "generic" },
        title: i18n.t("Transaction"),
      };
  }
};

/**
 * The treatment family an operation type belongs to. Row identity comes from
 * here — from what the account actually submitted — never inferred from the
 * shape of the balance changes it produced. Shapes lie about identity: an LP
 * deposit debits two assets and "looks like" a contract call, a claim credits
 * one asset and "looks like" a payment, two opposite payments in one
 * transaction "look like" a swap. The balance classification is consulted
 * only for what it actually knows — direction, amounts, and tokens.
 */
type ValueFamily =
  | "transfer"
  | "pathPayment"
  | "lpDeposit"
  | "lpWithdraw"
  | "claim"
  | "claimCreate"
  | "offer";

const VALUE_FAMILIES: Partial<Record<V2OperationType, ValueFamily>> = {
  PAYMENT: "transfer",
  CREATE_ACCOUNT: "transfer",
  ACCOUNT_MERGE: "transfer",
  // No design copy for a clawback yet, so the victim's row reads Sent — the
  // least-wrong of the existing treatments. Revisit when copy exists.
  CLAWBACK: "transfer",
  PATH_PAYMENT_STRICT_SEND: "pathPayment",
  PATH_PAYMENT_STRICT_RECEIVE: "pathPayment",
  LIQUIDITY_POOL_DEPOSIT: "lpDeposit",
  LIQUIDITY_POOL_WITHDRAW: "lpWithdraw",
  CLAIM_CLAIMABLE_BALANCE: "claim",
  CREATE_CLAIMABLE_BALANCE: "claimCreate",
  MANAGE_SELL_OFFER: "offer",
  MANAGE_BUY_OFFER: "offer",
  CREATE_PASSIVE_SELL_OFFER: "offer",
};

/**
 * Which family drives the row when a transaction holds several operations:
 * a contract invocation outranks everything (the protocol overlay needs the
 * contract identity); one distinct value-moving family names itself; several
 * distinct ones are honestly "mixed" — never "Contract" without a contract.
 * No value-mover at all falls to the config-cards/labeled-op path.
 */
const resolveOpFamily = (
  operationTypes: V2OperationType[],
): ValueFamily | "invoke" | "mixed" | "none" => {
  if (operationTypes.includes("INVOKE_HOST_FUNCTION")) {
    return "invoke";
  }
  const families = new Set(
    operationTypes.flatMap((type) => {
      const family = VALUE_FAMILIES[type];
      return family ? [family] : [];
    }),
  );
  if (families.size === 1) {
    return [...families][0];
  }
  return families.size > 1 ? "mixed" : "none";
};

/** Every balance row the classification carries, in its original order. */
const rowsOf = (classification: BalanceClassification): BalanceChangeRow[] => {
  switch (classification.type) {
    case "sent":
    case "received":
      return [classification.row];
    case "swapped":
      return [classification.credit, classification.debit];
    case "multiple":
      return classification.rows;
    case "none":
    default:
      return [];
  }
};

/**
 * Row amounts for a family whose identity is NOT the movement itself (LP,
 * offer, claim): the single amount when exactly one asset moved, otherwise
 * the "Multiple" label — the right column never stacks amounts. The full
 * per-asset breakdown lives in the detail sheet's balance card.
 */
const amountsFor = (rows: BalanceChangeRow[]): Presentation["amounts"] => {
  if (rows.length === 0) {
    return null;
  }
  if (rows.length === 1) {
    return [signedAmount(rows[0])];
  }
  return "multiple";
};

/**
 * The treatment for classic multi-asset movement: named after the operations
 * when they all agree on a label (a payment batch is "Payment", a multi-hop
 * path payment is "Path payment"), and only a genuinely heterogeneous batch —
 * which has no single identity — reads "Transaction". Never "Contract":
 * there is no contract in it.
 */
const transactionFallback = (
  rows: BalanceChangeRow[],
  operationTypes: V2OperationType[],
): Presentation => {
  const label = homogeneousOpLabel(operationTypes) ?? i18n.t("Transaction");
  return {
    kind: "other",
    rowIcon:
      rows.length > 0
        ? { type: "asset", tokens: distinctTokens(rows) }
        : { type: "contract" },
    primaryText: label,
    secondaryText: i18n.t("Multiple balance changes"),
    secondaryIcon: null,
    amounts: "multiple",
    title: label,
  };
};

const basePresentation = ({
  classification,
  cards,
  protocol,
  failed,
  operationTypes,
}: {
  classification: BalanceClassification;
  cards: StateChangeCardData[];
  protocol: ProtocolInfo | null;
  failed: boolean;
  /** this account's operations within the transaction, in ledger order */
  operationTypes: V2OperationType[];
}): Presentation => {
  if (failed) {
    return {
      kind: "failed",
      rowIcon: { type: "failed" },
      primaryText: i18n.t("Transaction failed"),
      secondaryText: i18n.t("Failed"),
      secondaryIcon: "failed",
      amounts: null,
      title: i18n.t("Transaction failed"),
    };
  }

  // Identity first: which family of operation is this? Only then consult the
  // balance classification, and only for direction/amounts/tokens.
  const family = resolveOpFamily(operationTypes);

  /** Classic swap treatment: the pair is the row's identity. */
  const classicSwap = (
    classification: Extract<BalanceClassification, { type: "swapped" }>,
  ): Presentation => {
    const { credit, debit } = classification;
    const pair = `${debit.token.code} ${i18n.t("to")} ${credit.token.code}`;
    return {
      kind: "swapped",
      rowIcon: { type: "asset", tokens: [debit.token, credit.token] },
      primaryText: pair,
      secondaryText: i18n.t("Swapped"),
      secondaryIcon: "swap",
      amounts: [signedAmount(credit)],
      title: `${i18n.t("Swapped")} ${pair}`,
    };
  };

  /** Classic single-movement treatment: the asset is the row's identity. */
  const plainMovement = (
    row: BalanceChangeRow,
    direction: "sent" | "received",
  ): Presentation => ({
    kind: direction,
    rowIcon: { type: "asset", tokens: [row.token] },
    primaryText: row.token.code,
    secondaryText: direction === "sent" ? i18n.t("Sent") : i18n.t("Received"),
    secondaryIcon: direction,
    amounts: [signedAmount(row)],
    title: `${direction === "sent" ? i18n.t("Sent") : i18n.t("Received")} ${row.token.code}`,
  });

  switch (family) {
    case "invoke": {
      const rows = rowsOf(classification);

      // A recognized protocol brands the row (and the protocolAction overlay
      // may relabel it further); the classification only picks direction and
      // amounts. Unknown protocols fall through to the movement/name
      // treatments below.
      if (protocol) {
        const secondaryIcon = protocol.domain ? "globe" : "contract";
        switch (classification.type) {
          case "swapped":
            return {
              kind: "swapped",
              rowIcon: iconForContract(protocol, distinctTokens(rows)),
              primaryText: protocol.name,
              secondaryText: protocol.domain ?? i18n.t("Swapped"),
              secondaryIcon: protocol.domain ? "globe" : "swap",
              amounts: [signedAmount(classification.credit)],
              title: protocol.name,
            };
          case "sent":
          case "received":
            return {
              kind: classification.type,
              rowIcon: iconForContract(protocol, [classification.row.token]),
              primaryText: protocol.name,
              secondaryText:
                protocol.domain ??
                (classification.type === "sent"
                  ? i18n.t("Sent")
                  : i18n.t("Received")),
              secondaryIcon: protocol.domain ? "globe" : classification.type,
              amounts: [signedAmount(classification.row)],
              title: `${classification.type === "sent" ? i18n.t("Sent") : i18n.t("Received")} ${classification.row.token.code}`,
            };
          case "multiple":
            return {
              kind: "contract",
              rowIcon: iconForContract(protocol, distinctTokens(rows)),
              primaryText: protocol.name,
              secondaryText:
                protocol.domain ?? i18n.t("Multiple balance changes"),
              secondaryIcon,
              amounts: "multiple",
              title: protocol.name,
            };
          case "none":
          default:
            return {
              kind: "contract",
              rowIcon: {
                type: "protocol",
                src: protocol.iconUrl,
                name: protocol.name,
              },
              primaryText: protocol.name,
              secondaryText: protocol.domain ?? i18n.t("Interacted"),
              secondaryIcon,
              amounts: null,
              title: protocol.name,
            };
        }
      }

      // Unknown protocol: the STATE CHANGES say what actually happened — a
      // single movement renders exactly like a classic payment (a SEP-41
      // transfer credit is a received payment), a swap-shaped movement
      // renders the classic pair whatever contract routed it. Invocation
      // names deliberately do NOT label rows — they stay in the detail
      // sheet — so anything the movement can't describe stays "Contract".
      switch (classification.type) {
        case "swapped":
          return classicSwap(classification);
        case "sent":
        case "received":
          return plainMovement(classification.row, classification.type);
        case "multiple":
          return {
            kind: "contract",
            rowIcon: iconForContract(null, distinctTokens(rows)),
            primaryText: i18n.t("Contract"),
            secondaryText: i18n.t("Multiple balance changes"),
            secondaryIcon: "contract",
            amounts: "multiple",
            title: i18n.t("Contract"),
          };
        case "none":
        default:
          // No movement — the contract identity is all the row can say; the
          // state changes (data entries, allowances, …) are supporting cards
          // in the detail sheet, not the row's title.
          return {
            kind: "contract",
            rowIcon: { type: "contract" },
            primaryText: i18n.t("Contract"),
            secondaryText: i18n.t("Interacted"),
            secondaryIcon: "contract",
            amounts: null,
            title: i18n.t("Contract"),
          };
      }
    }

    case "pathPayment": {
      if (classification.type === "swapped") {
        return classicSwap(classification);
      }
      // A path payment to (or from) another account is a transfer whose send
      // and receive legs live on different accounts.
      if (
        classification.type === "sent" ||
        classification.type === "received"
      ) {
        return plainMovement(classification.row, classification.type);
      }
      if (classification.type === "multiple") {
        return transactionFallback(classification.rows, operationTypes);
      }
      break; // none → cards/floor below
    }

    case "transfer": {
      if (
        classification.type === "sent" ||
        classification.type === "received"
      ) {
        return plainMovement(classification.row, classification.type);
      }
      if (
        classification.type === "swapped" ||
        classification.type === "multiple"
      ) {
        // Two opposite payments in one transaction LOOK like a swap and a
        // batch looks like anything — the ops say what it is (a homogeneous
        // batch names itself, e.g. "Payment"), never a swap pair and never
        // "Contract".
        return transactionFallback(rowsOf(classification), operationTypes);
      }
      break;
    }

    case "lpDeposit":
    case "lpWithdraw": {
      const label =
        family === "lpDeposit"
          ? i18n.t("Liquidity pool deposit")
          : i18n.t("Liquidity pool withdrawal");
      const rows = rowsOf(classification);
      return {
        kind: "other",
        rowIcon:
          rows.length > 0
            ? { type: "asset", tokens: distinctTokens(rows) }
            : { type: "contract" },
        primaryText: label,
        secondaryText: i18n.t("Submitted"),
        secondaryIcon: null,
        amounts: amountsFor(rows),
        title: label,
      };
    }

    case "claim": {
      const rows = rowsOf(classification);
      return {
        // kind stays shape-behavioral, not label-driven: a claim IS an
        // inbound credit, and kind feeds dust filtering and the sheet's
        // To/From direction — not the row text.
        kind: rows.length > 0 ? "received" : "other",
        rowIcon:
          rows.length > 0
            ? { type: "asset", tokens: distinctTokens(rows) }
            : { type: "settings", glyph: "claimable" },
        primaryText: i18n.t("Claimable balance claimed"),
        secondaryText: i18n.t("Claimed"),
        secondaryIcon: rows.length > 0 ? "received" : null,
        amounts: amountsFor(rows),
        title: i18n.t("Claimable balance claimed"),
      };
    }

    case "claimCreate":
      // The creator's debit stays in the detail sheet's balance card; the
      // row names the operation — nothing has been received by anyone yet,
      // so "Sent" (what the debit shape suggests) would be wrong.
      return {
        kind: "other",
        primaryText: i18n.t("Claimable balance created"),
        secondaryText: i18n.t("Pending claim"),
        secondaryIcon: null,
        rowIcon: { type: "settings", glyph: "claimable" },
        amounts: null,
        title: i18n.t("Claimable balance created"),
      };

    case "offer": {
      const rows = rowsOf(classification);
      return {
        kind: "other",
        rowIcon:
          rows.length > 0
            ? { type: "asset", tokens: distinctTokens(rows) }
            : { type: "contract" },
        primaryText: i18n.t("Offer"),
        secondaryText: i18n.t("Submitted"),
        secondaryIcon: null,
        // A crossed offer's fills show as amounts; the identity stays
        // "Offer" — the user placed an offer, the fill is its consequence.
        amounts: amountsFor(rows),
        title: i18n.t("Offer"),
      };
    }

    case "mixed":
      return transactionFallback(rowsOf(classification), operationTypes);

    case "none":
    default:
      break;
  }

  // None of this account's own operations moves value (config ops, or the
  // backend sent operations we don't know) — yet balances moved. That means
  // another account's operation in this transaction did it (operations[] only
  // carries the queried account's ops), so there is no op identity to name:
  // here, and only here, the movement shape legitimately drives the row.
  switch (classification.type) {
    case "sent":
    case "received":
      return plainMovement(classification.row, classification.type);
    case "swapped":
      return classicSwap(classification);
    case "multiple":
      return transactionFallback(classification.rows, operationTypes);
    case "none":
    default:
      break;
  }

  if (cards.length > 0) {
    const config = configPresentation(cards[0]);
    return { ...config, amounts: null };
  }

  // No state change to describe — fall back to naming the operation itself
  return { ...operationPresentation(operationTypes[0]), amounts: null };
};

/**
 * Contract-row icon per the design's fallback matrix: protocol logo when
 * known, otherwise the moved tokens' icons (stacked "+N" when >2), otherwise
 * the generic contract icon.
 */
const iconForContract = (
  protocol: ProtocolInfo | null,
  tokens: ResolvedToken[],
): RowIconDescriptor => {
  if (protocol) {
    return { type: "protocol", src: protocol.iconUrl, name: protocol.name };
  }
  if (tokens.length > 0) {
    return { type: "asset", tokens };
  }
  return { type: "contract" };
};

/**
 * The row presentation, with protocol-action labels overlaid when the
 * transaction emitted a recognized protocol state change.
 *
 * The overlay replaces only the four label fields. `kind`, `rowIcon`, and
 * `amounts` come from basePresentation untouched, so a relabelled row is
 * otherwise identical to the row that shipped before — that is the mechanism
 * behind the "preserve every other label" requirement, and why a failed
 * transaction still reads "Transaction failed": basePresentation returns the
 * failed row and `failed` suppresses the overlay.
 */
export const buildPresentation = (
  params: Parameters<typeof basePresentation>[0] & {
    protocolAction: ProtocolAction | null;
  },
): Presentation => {
  const base = basePresentation(params);
  const { protocolAction, failed } = params;

  if (!protocolAction || failed) {
    return base;
  }

  return {
    ...base,
    primaryText: protocolAction.label,
    secondaryText: protocolAction.protocolName,
    secondaryIcon: "contract",
    title: protocolAction.label,
  };
};
