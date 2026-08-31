import { getTokenPrices } from "@shared/api/internal";
import { ApiTokenPrices } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

export enum PriceSource {
  TokenPricesV1 = "token_prices_v1",
  TokenPricesV2 = "token_prices_v2",
}

export enum PriceFreshness {
  ConfirmationFetch = "confirmation_fetch",
  CachedDisplay = "cached_display",
}

export interface ConfirmationPriceSnapshot {
  /** Prices by canonical id. `null` when no snapshot could be produced. */
  pricesById: ApiTokenPrices | null;
  freshness: PriceFreshness;
  source: PriceSource;
}

export interface ConfirmationSnapshotHandle {
  /**
   * Freezes and returns the snapshot for a terminal event. Call exactly once,
   * at terminal status. If the fetch already succeeded, uses its result
   * (`confirmation_fetch`); otherwise — still pending, rejected, or cancelled
   * — the fetch is aborted and its result, even if it lands later, is never
   * consulted again, and this falls back to the prices already cached for the
   * on-screen display estimate (`cached_display`).
   */
  resolve(): ConfirmationPriceSnapshot;
  /**
   * Aborts the fetch and discards its result without producing a snapshot.
   * For a confirmation attempt that ends before submission — no terminal
   * event will consume the snapshot, so the request is cancelled immediately.
   * Idempotent, and safe after `resolve()`.
   */
  cancel(): void;
}

/**
 * Issues ONE price fetch covering every leg's canonical id, started at
 * confirmation and never blocking signing/submission — callers do not await
 * this. `cachedDisplayPrices` is the price map already held for the on-screen
 * fiat estimate, captured by the caller at this same moment: it must reflect
 * "the price already shown to the user for this transaction", not whatever
 * the cache holds later when `resolve()` is called.
 *
 * Cancellation is a real network abort on the v1 endpoint (a direct fetch).
 * The v2 endpoint runs in the background service worker across a message
 * boundary the AbortSignal cannot cross, so there cancellation is best-effort:
 * the request is skipped if already aborted, and a result that arrives after
 * abort is discarded even though the HTTP itself ran to completion.
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
  const source: PriceSource = useV2
    ? PriceSource.TokenPricesV2
    : PriceSource.TokenPricesV1;

  const controller = new AbortController();
  let succeeded = false;
  let fetchedPrices: ApiTokenPrices | null = null;

  // Never an unhandled rejection: a failed fetch degrades to cached_display
  // exactly like one that's merely still pending at resolve() time.
  getTokenPrices(canonicalIds, networkDetails, useV2, controller.signal)
    .then((result) => {
      // A result landing after abort is discarded, never consulted.
      if (!controller.signal.aborted) {
        fetchedPrices = result;
        succeeded = true;
      }
    })
    .catch(() => {
      // Rejected (network error, non-2xx, or aborted): fall back to the
      // display-cache price at resolve() time rather than reporting the legs
      // unpriced — coverage takes priority over freshness.
      succeeded = false;
    });

  return {
    resolve: () => {
      // A 200 can still omit a requested id (e.g. a non-held destination
      // token /token-prices has no entry for). A partial result isn't
      // trustworthy enough to use even for the ids it does cover, so it's
      // treated the same as no result at all: fall back to the display
      // cache wholesale rather than merging.
      const isComplete =
        succeeded && canonicalIds.every((id) => fetchedPrices?.[id] != null);
      if (isComplete) {
        return {
          pricesById: fetchedPrices,
          freshness: PriceFreshness.ConfirmationFetch,
          source,
        };
      }
      // Pending, rejected, incomplete, or cancelled: abort so the request
      // cannot outlive the flow that needed it, and close on the display
      // cache.
      controller.abort();
      return {
        pricesById: cachedDisplayPrices,
        freshness: PriceFreshness.CachedDisplay,
        source,
      };
    },
    cancel: () => {
      controller.abort();
    },
  };
};
