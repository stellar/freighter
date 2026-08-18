import { useRef } from "react";

import { ApiTokenPrices } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";

import {
  getBalanceCanonicalKey,
  sortBalancesByValue,
} from "popup/helpers/balance";

/**
 * Returns the user's balances sorted by descending USD value, with the
 * order **frozen for the lifetime of the calling component** unless the
 * set of held assets changes.
 *
 * Token prices on the Account view refresh periodically (and again when
 * `useGetAccountData` re-fetches). Re-sorting on every refresh would
 * shuffle rows mid-view, which is jarring — especially in sidebar mode
 * where Freighter can stay open indefinitely. Instead, this hook captures
 * the sort order on first arrival of priced data and re-uses it on
 * subsequent renders. The order is recomputed only when:
 *
 * - the set of asset identities changes (an asset was added, removed, or
 *   trustline-deauthorized), or
 * - the consumer component remounts (popup is reopened, or the user
 *   navigates back to the Account view from another route).
 *
 * Updated `total` / `available` values flow through to the UI even when
 * the order is preserved, because the hook re-keys the snapshot against
 * the latest balance objects on every render.
 */
export const useStableSortedBalances = (
  balances: AssetType[],
  prices: ApiTokenPrices | null | undefined,
): AssetType[] => {
  const snapshotRef = useRef<{
    signature: string;
    orderKeys: string[];
  } | null>(null);

  if (balances.length === 0) {
    snapshotRef.current = null;
    return [];
  }

  const signature = balances
    .map(getBalanceCanonicalKey)
    .slice()
    .sort()
    .join("|");

  const snap = snapshotRef.current;
  if (!snap || snap.signature !== signature) {
    const sorted = sortBalancesByValue(balances, prices);
    snapshotRef.current = {
      signature,
      orderKeys: sorted.map(getBalanceCanonicalKey),
    };
    return sorted;
  }

  const byKey = new Map(balances.map((b) => [getBalanceCanonicalKey(b), b]));
  return snap.orderKeys
    .map((k) => byKey.get(k))
    .filter((b): b is AssetType => b !== undefined);
};
