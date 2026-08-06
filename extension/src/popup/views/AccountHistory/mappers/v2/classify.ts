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
import { ContractCallInfo } from "./contract";
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
const OPERATION_LABELS: Partial<Record<V2OperationType, string>> = {
  CLAIM_CLAIMABLE_BALANCE: i18n.t("Claimable balance claimed"),
  CLAWBACK_CLAIMABLE_BALANCE: i18n.t("Claimable balance clawed back"),
  MANAGE_SELL_OFFER: i18n.t("Offer"),
  MANAGE_BUY_OFFER: i18n.t("Offer"),
  CREATE_PASSIVE_SELL_OFFER: i18n.t("Offer"),
  BUMP_SEQUENCE: i18n.t("Sequence bumped"),
  BEGIN_SPONSORING_FUTURE_RESERVES: i18n.t("Sponsorship"),
  END_SPONSORING_FUTURE_RESERVES: i18n.t("Sponsorship"),
  REVOKE_SPONSORSHIP: i18n.t("Sponsorship revoked"),
  EXTEND_FOOTPRINT_TTL: i18n.t("Footprint extended"),
  RESTORE_FOOTPRINT: i18n.t("Footprint restored"),
  LIQUIDITY_POOL_DEPOSIT: i18n.t("Liquidity pool deposit"),
  LIQUIDITY_POOL_WITHDRAW: i18n.t("Liquidity pool withdrawal"),
  ALLOW_TRUST: i18n.t("Trustline authorization"),
  INFLATION: i18n.t("Inflation"),
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

const basePresentation = ({
  classification,
  cards,
  contractCall,
  protocol,
  failed,
  operationTypes,
}: {
  classification: BalanceClassification;
  cards: StateChangeCardData[];
  contractCall: ContractCallInfo | null;
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

  // Balance movement drives the row when present
  switch (classification.type) {
    case "swapped": {
      const { credit, debit } = classification;
      const pair = `${debit.token.code} ${i18n.t("to")} ${credit.token.code}`;
      const viaContract = contractCall !== null;
      return {
        kind: "swapped",
        rowIcon: viaContract
          ? iconForContract(protocol, distinctTokens([debit, credit]))
          : { type: "asset", tokens: [debit.token, credit.token] },
        primaryText: viaContract
          ? (protocol?.name ?? i18n.t("Contract"))
          : pair,
        secondaryText: protocol?.domain ?? i18n.t("Swapped"),
        secondaryIcon: protocol?.domain ? "globe" : "swap",
        // Row shows only the received (credit) amount, matching the legacy
        // list; the debit is still shown in the detail drawer's balance card.
        amounts: [signedAmount(credit)],
        title: viaContract
          ? i18n.t("Contract")
          : `${i18n.t("Swapped")} ${pair}`,
      };
    }
    case "sent":
      return {
        kind: "sent",
        rowIcon: contractCall
          ? iconForContract(protocol, [classification.row.token])
          : { type: "asset", tokens: [classification.row.token] },
        primaryText: contractCall
          ? (protocol?.name ?? i18n.t("Contract"))
          : classification.row.token.code,
        secondaryText: protocol?.domain ?? i18n.t("Sent"),
        secondaryIcon: protocol?.domain ? "globe" : "sent",
        amounts: [signedAmount(classification.row)],
        title: `${i18n.t("Sent")} ${classification.row.token.code}`,
      };
    case "received":
      return {
        kind: "received",
        rowIcon: contractCall
          ? iconForContract(protocol, [classification.row.token])
          : { type: "asset", tokens: [classification.row.token] },
        primaryText: contractCall
          ? (protocol?.name ?? i18n.t("Contract"))
          : classification.row.token.code,
        secondaryText: protocol?.domain ?? i18n.t("Received"),
        secondaryIcon: protocol?.domain ? "globe" : "received",
        amounts: [signedAmount(classification.row)],
        title: `${i18n.t("Received")} ${classification.row.token.code}`,
      };
    case "multiple":
      return {
        kind: contractCall ? "contract" : "other",
        rowIcon: iconForContract(protocol, distinctTokens(classification.rows)),
        primaryText: protocol?.name ?? i18n.t("Contract"),
        secondaryText: protocol?.domain ?? i18n.t("Multiple balance changes"),
        secondaryIcon: protocol?.domain ? "globe" : "contract",
        amounts: "multiple",
        title: protocol?.name ?? i18n.t("Contract"),
      };
    case "none":
    default:
      break;
  }

  // No balance movement. A contract invocation is still identified by the
  // contract it called, even when it emitted state changes (data entries,
  // allowances, …) — those are supporting cards in the detail sheet, not the
  // row's title: node 12132:62391 heads a data-entry tx "Contract / domain.com".
  // Only classic config operations fall through to configPresentation.
  if (contractCall) {
    return {
      kind: "contract",
      rowIcon: protocol
        ? { type: "protocol", src: protocol.iconUrl, name: protocol.name }
        : { type: "contract" },
      primaryText: protocol?.name ?? i18n.t("Contract"),
      secondaryText: protocol?.domain ?? i18n.t("Interacted"),
      secondaryIcon: protocol?.domain ? "globe" : "contract",
      amounts: null,
      title: protocol?.name ?? i18n.t("Contract"),
    };
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
