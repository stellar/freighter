import { getTokenPrices } from "@shared/api/internal";
import { ApiTokenPrices } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

export enum PriceSource {
  TOKEN_PRICES_V1 = "token_prices_v1",
  TOKEN_PRICES_V2 = "token_prices_v2",
}

export enum PriceFreshness {
  CONFIRMATION_FETCH = "confirmation_fetch",
  CACHED_DISPLAY = "cached_display",
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
 * Issues ONE price fetch covering every leg's canonical id, started once
 * signing has succeeded and immediately before submission — as close to the
 * transaction's execution as the flow allows — and never blocking submission,
 * since callers do not await this. `cachedDisplayPrices` is the price map
 * already held for the on-screen fiat estimate, captured by the caller at
 * this same moment, and is the fallback `resolve()` closes on when the fetch
 * has not landed by terminal status. Because the snapshot starts after
 * signing, that map is the display cache as of the start of submission rather
 * than as of the confirm tap — a password prompt or hardware approval in
 * between can have let it refresh. Either way it must be captured here, not
 * read later when `resolve()` is called.
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
    ? PriceSource.TOKEN_PRICES_V2
    : PriceSource.TOKEN_PRICES_V1;

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
          freshness: PriceFreshness.CONFIRMATION_FETCH,
          source,
        };
      }
      // Pending, rejected, incomplete, or cancelled: abort so the request
      // cannot outlive the flow that needed it, and close on the display
      // cache.
      controller.abort();
      return {
        pricesById: cachedDisplayPrices,
        freshness: PriceFreshness.CACHED_DISPLAY,
        source,
      };
    },
    cancel: () => {
      controller.abort();
    },
  };
};
