import { useEffect, useRef } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";
import {
  DestinationTokenDetails,
  saveDestinationTokenDetails,
} from "popup/ducks/transactionSubmission";
import {
  getAssetSecurityLevel,
  extractAssetScanWarnings,
  isBlockaidEnabled,
  scanAssetBulk,
} from "popup/helpers/blockaid";
import { getCachedAssetScan } from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";

interface UseSwapDestinationScanParams {
  destinationTokenDetails: DestinationTokenDetails | null;
  networkDetails: NetworkDetails;
  blockaidOverrideState?: string | null;
  dispatch: AppDispatch;
}

/**
 * If the destination token was picked before its Blockaid verdict landed (the
 * picker's bulk scan is async), its securityLevel is missing — so the receive
 * badge and the review's security gate would silently lose the assessment.
 * Recover the verdict from the in-session scan cache, or scan the single token,
 * then persist it onto the stored destination details.
 *
 * The async write is guarded: if the destination changes (direction toggle, a
 * different pick) or the screen unmounts while the scan is in flight, the
 * cleanup cancels + aborts so a stale verdict for the OLD token is never written
 * onto the new destination.
 */
export const useSwapDestinationScan = ({
  destinationTokenDetails,
  networkDetails,
  blockaidOverrideState,
  dispatch,
}: UseSwapDestinationScanParams) => {
  const resolvedScanTokenRef = useRef<string | null>(null);
  useEffect(() => {
    const details = destinationTokenDetails;
    if (
      !details ||
      !details.issuer ||
      details.securityLevel !== undefined ||
      !isBlockaidEnabled(networkDetails)
    ) {
      return;
    }
    const id = `${details.tokenCode}-${details.issuer}`;
    if (resolvedScanTokenRef.current === id) {
      return;
    }
    resolvedScanTokenRef.current = id;

    let cancelled = false;
    const controller = new AbortController();

    const resolveVerdict = async () => {
      let scan = getCachedAssetScan(
        networkDetails.network,
        details.tokenCode,
        details.issuer!,
      );
      if (!scan) {
        const bulk = await scanAssetBulk(
          [id],
          networkDetails,
          controller.signal,
        );
        scan = bulk?.results?.[id];
      }
      if (cancelled) {
        return;
      }
      // A missing scan (cache miss + failed/empty bulk scan) must NOT fail open:
      // getAssetSecurityLevel maps absent data to UNABLE_TO_SCAN on a
      // Blockaid-enabled network, matching the picker's unscanned-row handling,
      // so the review shows the "couldn't be scanned" banner + acknowledgement
      // gate instead of a clean confirm.
      const securityLevel = getAssetSecurityLevel({
        blockaidData: scan,
        blockaidOverrideState,
        networkDetails,
      });
      const securityWarnings = extractAssetScanWarnings(scan);
      dispatch(
        saveDestinationTokenDetails({
          ...details,
          securityLevel,
          ...(securityWarnings.length ? { securityWarnings } : {}),
        }),
      );
    };
    resolveVerdict();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    destinationTokenDetails?.tokenCode,
    destinationTokenDetails?.issuer,
    destinationTokenDetails?.securityLevel,
    networkDetails.network,
    blockaidOverrideState,
  ]);
};
