import { getTokenPrices } from "@shared/api/internal";
import { ApiTokenPrices } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

export type PriceSource = "token_prices_v1" | "token_prices_v2";
export type PriceFreshness = "confirmation_fetch" | "cached_display";

export interface ConfirmationPriceSnapshot {
  /** Prices by canonical id. `null` when no snapshot could be produced. */
  pricesById: ApiTokenPrices | null;
  freshness: PriceFreshness;
  source: PriceSource;
}

export interface ConfirmationSnapshotHandle {
  /**
   * Freezes and returns the snapshot for a terminal event. Call exactly once,
   * at terminal status (TR-11). If the fetch has already settled, uses its
   * result (`confirmation_fetch`); otherwise the fetch is abandoned — its
   * result, even if it lands later, is never consulted again (TR-13) — and
   * this falls back to the prices already cached for the on-screen display
   * estimate (`cached_display`).
   */
  resolve(): ConfirmationPriceSnapshot;
}

/**
 * Issues ONE price fetch covering every leg's canonical id (TR-9), started at
 * confirmation and never blocking signing/submission (TR-10) — callers do
 * not await this. `cachedDisplayPrices` is the price map already held for the
 * on-screen fiat estimate, captured by the caller at this same moment: it
 * must reflect "the price already shown to the user for this transaction"
 * (TR-11), not whatever the cache holds later when `resolve()` is called.
 */
export const startConfirmationPriceSnapshot = ({
  canonicalIds,
  networkDetails,
  useV2,
  cachedDisplayPrices,
}: {
  canonicalIds: string[];
  networkDetails: NetworkDetails;
  useV2: boolean;
  cachedDisplayPrices: ApiTokenPrices | null;
}): ConfirmationSnapshotHandle => {
  const source: PriceSource = useV2 ? "token_prices_v2" : "token_prices_v1";

  let settled = false;
  let fetchedPrices: ApiTokenPrices | null = null;

  // Never an unhandled rejection: a failed fetch degrades to cached_display
  // exactly like one that's merely still pending at resolve() time.
  getTokenPrices(canonicalIds, networkDetails, useV2)
    .then((result) => {
      fetchedPrices = result;
    })
    .catch(() => {
      fetchedPrices = null;
    })
    .finally(() => {
      settled = true;
    });

  return {
    resolve: () => {
      if (settled) {
        return {
          pricesById: fetchedPrices,
          freshness: "confirmation_fetch",
          source,
        };
      }
      return {
        pricesById: cachedDisplayPrices,
        freshness: "cached_display",
        source,
      };
    },
  };
};
