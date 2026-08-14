/**
 * Client-side filters over the normalized history model, mirroring the v1
 * behaviors (dust hiding via the isHideDustEnabled setting).
 *
 * Claimable-balance spam filtering (v1: create_claimable_balance ops in
 * transactions with >50 operations) is not portable yet — the v2 payload only
 * carries the queried account's operations, not the transaction's total
 * operation count. Covered by the backend follow-up in
 * extension/specs/history-redesign-plan.md.
 */

import BigNumber from "bignumber.js";
import { Asset } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { isContractId } from "@shared/api/helpers/soroban";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { HistoryEntry } from "popup/views/AccountHistory/model";

const DUST_THRESHOLD = new BigNumber(0.1);

/** Mirrors v1 getIsDustPayment: native credit to the account ≤ 0.1 XLM */
const isDustEntry = (
  entry: HistoryEntry,
  nativeTokenId: string | null,
): boolean => {
  if (
    entry.kind !== "received" ||
    entry.details.balanceChanges.length !== 1 ||
    entry.details.balanceChanges[0].token.contractId !== nativeTokenId
  ) {
    return false;
  }
  // an amount we couldn't scale is not something we can call dust
  const { amount } = entry.details.balanceChanges[0];
  return amount !== null && new BigNumber(amount).lte(DUST_THRESHOLD);
};

export const filterHistoryEntries = (
  entries: HistoryEntry[],
  {
    isHideDustEnabled,
    nativeTokenId,
  }: { isHideDustEnabled: boolean; nativeTokenId: string | null },
): HistoryEntry[] =>
  isHideDustEnabled
    ? entries.filter((entry) => !isDustEntry(entry, nativeTokenId))
    : entries;

/**
 * Canonical balance key ("native" | "CODE:ISSUER" | "CODE:C...") → the SAC
 * contract id the v2 wire uses as `token_id`. Null when no contract id can
 * exist for the key (LP shares, malformed keys) — the caller decides what an
 * unfilterable key means for its surface.
 */
export const resolveCanonicalToContractId = (
  canonical: string,
  networkDetails: NetworkDetails,
): string | null => {
  if (canonical === "native") {
    return getNativeContractDetails(networkDetails).contract || null;
  }
  const [code, issuer] = canonical.split(":");
  if (!code || !issuer) {
    return null;
  }
  if (isContractId(issuer)) {
    return issuer;
  }
  try {
    return new Asset(code, issuer).contractId(networkDetails.networkPassphrase);
  } catch {
    // LP-share keys and malformed issuers have no SAC id
    return null;
  }
};

/** Does any part of the entry — a balance movement or a state-change card —
 * touch the given token? */
const entryTouchesToken = (
  entry: HistoryEntry,
  contractId: string,
): boolean => {
  if (
    entry.details.balanceChanges.some(
      (row) => row.token.contractId === contractId,
    )
  ) {
    return true;
  }
  return entry.details.stateChangeCards.some((card) => {
    switch (card.kind) {
      case "trustlines":
        return card.entries.some(
          (line) => line.token.contractId === contractId,
        );
      case "balanceAuthorizations":
        return card.tokens.some((token) => token.contractId === contractId);
      case "allowance":
        return card.token.contractId === contractId;
      default:
        return false;
    }
  });
};

/**
 * The entries that touch one asset, for the home screen's per-asset history
 * (AssetDetail). An unresolvable key filters to nothing rather than to
 * everything: showing other assets' history under this asset would be a
 * wrong answer, an empty list is merely an incomplete one.
 */
export const filterEntriesByToken = (
  entries: HistoryEntry[],
  canonical: string,
  networkDetails: NetworkDetails,
): HistoryEntry[] => {
  const contractId = resolveCanonicalToContractId(canonical, networkDetails);
  if (!contractId) {
    return [];
  }
  return entries.filter((entry) => entryTouchesToken(entry, contractId));
};
