/**
 * Derives the list-row presentation (kind, texts, icon descriptor, amounts)
 * and the detail title from the mapped balance classification + state-change
 * cards. All user-facing strings are centralized here so design/i18n
 * adjustments stay one-file changes (wrapped by the UI layer's t()).
 */

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

type Presentation = Pick<
  HistoryEntry,
  | "kind"
  | "rowIcon"
  | "primaryText"
  | "secondaryText"
  | "secondaryIcon"
  | "amounts"
> & { title: string };

const signedAmount = (row: BalanceChangeRow) => ({
  text: `${row.direction === "credit" ? "+" : "-"}${trimTrailingZeros(
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
    case "reserves":
      return {
        kind: "other",
        primaryText: i18n.t("Reserves"),
        secondaryText:
          card.verb === "sponsored"
            ? i18n.t("Reserve sponsored")
            : i18n.t("Reserve unsponsored"),
        secondaryIcon: "settings",
        rowIcon: { type: "settings", glyph: "reserve" },
        title: i18n.t("Reserve change"),
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

export const buildPresentation = ({
  classification,
  cards,
  contractCall,
  protocol,
  failed,
}: {
  classification: BalanceClassification;
  cards: StateChangeCardData[];
  contractCall: ContractCallInfo | null;
  protocol: ProtocolInfo | null;
  failed: boolean;
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

  // No balance movement: contract call or pure config change
  if (contractCall && cards.length === 0) {
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

  // Nothing decodable at all
  return {
    kind: "other",
    rowIcon: { type: "contract" },
    primaryText: i18n.t("Transaction"),
    secondaryText: i18n.t("Interacted"),
    secondaryIcon: null,
    amounts: null,
    title: i18n.t("Transaction"),
  };
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
