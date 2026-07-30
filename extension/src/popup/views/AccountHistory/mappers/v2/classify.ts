/**
 * Derives the list-row presentation (kind, texts, icon descriptor, amounts)
 * and the detail title from the mapped balance classification + state-change
 * cards. All user-facing strings are centralized here so design/i18n
 * adjustments stay one-file changes (wrapped by the UI layer's t()).
 */

import { formatAmount, trimTrailingZeros } from "popup/helpers/formatters";
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
  const settings = { type: "settings" } as const;
  switch (card.kind) {
    case "accountCreated":
      return {
        kind: "accountCreated",
        primaryText: "Account created",
        secondaryText: "Created",
        secondaryIcon: "add",
        rowIcon: { type: "account", variant: "create" },
        title: "Account created",
      };
    case "accountMerged":
      return {
        kind: "accountMerged",
        primaryText: "Account merged",
        secondaryText: "Merged",
        secondaryIcon: "remove",
        rowIcon: { type: "account", variant: "merge" },
        title: "Account merged",
      };
    case "trustlines": {
      const first = card.entries[0];
      const primaryText =
        card.entries.length === 1 ? first.token.code : "Trustlines";
      if (card.verb === "removed") {
        return {
          kind: "trustlineRemoved",
          primaryText,
          secondaryText: "Removed trustline",
          secondaryIcon: "remove",
          rowIcon: { type: "asset", tokens: card.entries.map((e) => e.token) },
          title: "Removed trustline",
        };
      }
      return {
        kind: "trustlineAdded",
        primaryText,
        secondaryText:
          card.verb === "created" ? "Added trustline" : "Updated trustline",
        secondaryIcon: "add",
        rowIcon: { type: "asset", tokens: card.entries.map((e) => e.token) },
        title:
          card.verb === "created" ? "Added trustline" : "Updated trustline",
      };
    }
    case "signers":
      return {
        kind: "other",
        primaryText: "Signers",
        secondaryText: `Signer ${card.verb}`,
        secondaryIcon: "settings",
        rowIcon: settings,
        title: "Signer change",
      };
    case "thresholds":
      return {
        kind: "other",
        primaryText: "Thresholds",
        secondaryText: "Threshold updated",
        secondaryIcon: "settings",
        rowIcon: settings,
        title: "Threshold updated",
      };
    case "dataEntry":
      return {
        kind: "other",
        primaryText: "Data entry",
        secondaryText: `Data entry ${card.verb}`,
        secondaryIcon: "settings",
        rowIcon: settings,
        title: `Data entry ${card.verb}`,
      };
    case "homeDomain":
      return {
        kind: "other",
        primaryText: "Home domain",
        secondaryText: `Home domain ${card.verb}`,
        secondaryIcon: "settings",
        rowIcon: settings,
        title: `Home domain ${card.verb}`,
      };
    case "flags":
      return {
        kind: "other",
        primaryText: "Account settings",
        secondaryText: "Setting updated",
        secondaryIcon: "settings",
        rowIcon: settings,
        title: "Account setting updated",
      };
    case "balanceAuthorizations":
      return {
        kind: "other",
        primaryText:
          card.tokens.length === 1 ? card.tokens[0].code : "Trustlines",
        secondaryText: card.authorized
          ? "Balance authorized"
          : "Balance unauthorized",
        secondaryIcon: "settings",
        rowIcon: { type: "asset", tokens: card.tokens },
        title: card.authorized ? "Balance authorized" : "Balance unauthorized",
      };
    case "reserves":
      return {
        kind: "other",
        primaryText: "Reserves",
        secondaryText:
          card.verb === "sponsored"
            ? "Reserve sponsored"
            : "Reserve unsponsored",
        secondaryIcon: "settings",
        rowIcon: settings,
        title: "Reserve change",
      };
    default:
      return {
        kind: "other",
        primaryText: "Transaction",
        secondaryText: "Interacted",
        secondaryIcon: null,
        rowIcon: settings,
        title: "Transaction",
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
      primaryText: "Transaction failed",
      secondaryText: "Failed",
      secondaryIcon: "failed",
      amounts: null,
      title: "Transaction failed",
    };
  }

  // Balance movement drives the row when present
  switch (classification.type) {
    case "swapped": {
      const { credit, debit } = classification;
      const pair = `${debit.token.code} to ${credit.token.code}`;
      const viaContract = contractCall !== null;
      return {
        kind: "swapped",
        rowIcon: viaContract
          ? iconForContract(protocol, distinctTokens([debit, credit]))
          : { type: "asset", tokens: [debit.token, credit.token] },
        primaryText: viaContract ? (protocol?.name ?? "Contract") : pair,
        secondaryText: protocol?.domain ?? "Swapped",
        secondaryIcon: protocol?.domain ? "globe" : "swap",
        amounts: [signedAmount(credit), signedAmount(debit)],
        title: viaContract ? "Contract" : `Swapped ${pair}`,
      };
    }
    case "sent":
      return {
        kind: "sent",
        rowIcon: contractCall
          ? iconForContract(protocol, [classification.row.token])
          : { type: "asset", tokens: [classification.row.token] },
        primaryText: contractCall
          ? (protocol?.name ?? "Contract")
          : classification.row.token.code,
        secondaryText: protocol?.domain ?? "Sent",
        secondaryIcon: protocol?.domain ? "globe" : "sent",
        amounts: [signedAmount(classification.row)],
        title: `Sent ${classification.row.token.code}`,
      };
    case "received":
      return {
        kind: "received",
        rowIcon: contractCall
          ? iconForContract(protocol, [classification.row.token])
          : { type: "asset", tokens: [classification.row.token] },
        primaryText: contractCall
          ? (protocol?.name ?? "Contract")
          : classification.row.token.code,
        secondaryText: protocol?.domain ?? "Received",
        secondaryIcon: protocol?.domain ? "globe" : "received",
        amounts: [signedAmount(classification.row)],
        title: `Received ${classification.row.token.code}`,
      };
    case "multiple":
      return {
        kind: contractCall ? "contract" : "other",
        rowIcon: iconForContract(protocol, distinctTokens(classification.rows)),
        primaryText: protocol?.name ?? "Contract",
        secondaryText: protocol?.domain ?? "Multiple balance changes",
        secondaryIcon: protocol?.domain ? "globe" : "contract",
        amounts: "multiple",
        title: protocol?.name ?? "Contract",
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
      primaryText: protocol?.name ?? "Contract",
      secondaryText: protocol?.domain ?? "Interacted",
      secondaryIcon: protocol?.domain ? "globe" : "contract",
      amounts: null,
      title: protocol?.name ?? "Contract",
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
    primaryText: "Transaction",
    secondaryText: "Interacted",
    secondaryIcon: null,
    amounts: null,
    title: "Transaction",
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
