/**
 * Derives a history row's label from a protocol state change's (type, reason)
 * pair.
 *
 * State changes are modelled upstream as a noun/verb pair — the category names
 * the on-chain object, the reason names the action — so a recognized category
 * names the protocol and the pair names what happened. That is why this needs no
 * contract->protocol resolution: `BLEND_EMISSIONS` + `CLAIM` is self-describing.
 *
 * Only relabels rows the account can already see; never changes the amount,
 * icon, or kind.
 */

import {
  StateChangeCategory,
  StateChangeReason,
  V2StateChange,
} from "@shared/api/types/backend-api";
import i18n from "popup/helpers/localizationConfig";

export interface ProtocolAction {
  /** what happened, e.g. "Claimed emissions" */
  label: string;
  /** the protocol that emitted the row, e.g. "Blend" */
  protocolName: string;
}

/**
 * Recognized protocol categories and their display names. This doubles as the
 * registry: a category absent here is not a protocol category. An explicit map
 * rather than a `BLEND_` prefix test, so onboarding a protocol is deliberate and
 * its display name is not forced to match its category spelling.
 */
export const PROTOCOL_NAMES: Partial<Record<StateChangeCategory, string>> = {
  BLEND_SUPPLY: "Blend",
  BLEND_COLLATERAL: "Blend",
  BLEND_DEBT: "Blend",
  BLEND_AUCTION: "Blend",
  BLEND_EMISSIONS: "Blend",
  BLEND_BACKSTOP_EMISSIONS: "Blend",
  BLEND_BACKSTOP: "Blend",
  BLEND_BACKSTOP_QUEUE: "Blend",
};

type ActionKey = `${StateChangeCategory}:${StateChangeReason}`;

/**
 * What each (category, reason) pair means to the account whose history this is.
 *
 * Two Blend debt rows differ in whose position moved, which sets the label's
 * point of view:
 *  - BAD_DEBT is attributed to the borrower, so it reaches an ordinary wallet's
 *    history and reads from their side: "Debt defaulted".
 *  - BURN is attributed to the emitting pool, so it only surfaces when the
 *    queried address IS that pool — the endpoint accepts C-addresses.
 */
export const PROTOCOL_ACTION_LABELS: Partial<Record<ActionKey, string>> = {
  "BLEND_SUPPLY:CREDIT": i18n.t("Supplied"),
  "BLEND_SUPPLY:DEBIT": i18n.t("Withdrew supply"),
  "BLEND_COLLATERAL:CREDIT": i18n.t("Posted collateral"),
  "BLEND_COLLATERAL:DEBIT": i18n.t("Released collateral"),
  "BLEND_DEBT:BORROW": i18n.t("Borrowed"),
  // Both BLEND_AUCTION:FILL and, more softly, BLEND_DEBT:REPAY can be emitted
  // for something that happened *to* the account rather than because of it: a
  // liquidation fill emits this same (type, reason) for both the liquidated
  // borrower and the filler, and a liquidation can repay the borrower's debt
  // on their behalf. (type, reason) alone can't tell those sides apart —
  // that needs the wallet's own address, which this function deliberately
  // does not take — so "Repaid" stays as-is and the auction label below is
  // kept point-of-view-neutral rather than implying the account did the
  // filling.
  "BLEND_DEBT:REPAY": i18n.t("Repaid"),
  "BLEND_DEBT:FLASH_LOAN": i18n.t("Flash loan"),
  "BLEND_DEBT:BAD_DEBT": i18n.t("Debt defaulted"),
  "BLEND_DEBT:BURN": i18n.t("Debt written off"),
  "BLEND_AUCTION:FILL": i18n.t("Auction filled"),
  "BLEND_EMISSIONS:CLAIM": i18n.t("Claimed emissions"),
  "BLEND_BACKSTOP_EMISSIONS:CLAIM": i18n.t("Claimed backstop emissions"),
  "BLEND_BACKSTOP:CREDIT": i18n.t("Deposited to backstop"),
  "BLEND_BACKSTOP:DEBIT": i18n.t("Withdrew from backstop"),
  "BLEND_BACKSTOP_QUEUE:ADD": i18n.t("Queued backstop withdrawal"),
  "BLEND_BACKSTOP_QUEUE:REMOVE": i18n.t("Cancelled backstop withdrawal"),
};

/**
 * The first recognized protocol row in wire order, or null when the transaction
 * has none — in which case the caller keeps its existing presentation.
 *
 * A row counts only when BOTH its category is in PROTOCOL_NAMES and its
 * (type, reason) pair is in PROTOCOL_ACTION_LABELS, so a half-label — a protocol
 * with no action, or an action with no protocol — is unrepresentable.
 *
 * Wire order is deterministic: Blend assigns state-change ordinals in emission
 * order within its namespace. A transaction whose most interesting action is not
 * its first will be under-described; accepted, not solved.
 */
export const resolveProtocolAction = (
  changes: V2StateChange[],
): ProtocolAction | null => {
  for (const change of changes) {
    const protocolName = PROTOCOL_NAMES[change.type];
    if (!protocolName) {
      continue;
    }
    const label =
      PROTOCOL_ACTION_LABELS[`${change.type}:${change.reason}` as ActionKey];
    if (!label) {
      continue;
    }
    return { label, protocolName };
  }
  return null;
};
