import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";

import { CollectibleKey } from "@shared/api/types/types";
import { getHiddenCollectibles } from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";

export const useHiddenCollectibles = () => {
  const publicKey = useSelector(publicKeySelector);
  const [hiddenCollectibles, setHiddenCollectibles] = useState<
    Record<CollectibleKey, string>
  >({});
  // Which account the map on hand belongs to. The grid filters against the
  // map, so painting before the first fetch for an account lands flashes its
  // hidden collectibles into view; later refreshes (hide, unhide, close) keep
  // the current map on screen rather than spinning.
  const [loadedForKey, setLoadedForKey] = useState<string | null>(null);

  const refreshHiddenCollectibles = useCallback(async () => {
    if (!publicKey) {
      setHiddenCollectibles({});
      setLoadedForKey(publicKey);
      return;
    }

    try {
      const { hiddenCollectibles: hidden } = await getHiddenCollectibles({
        activePublicKey: publicKey,
      });
      setHiddenCollectibles(hidden || {});
    } catch (error) {
      console.error("Failed to fetch hidden collectibles:", error);
      setHiddenCollectibles({});
    } finally {
      // A failed fetch counts as loaded: an unfiltered grid beats a loader
      // that never resolves.
      setLoadedForKey(publicKey);
    }
  }, [publicKey]);

  // Fetch on mount
  useEffect(() => {
    refreshHiddenCollectibles();
  }, [refreshHiddenCollectibles]);

  const isCollectibleHidden = useCallback(
    (collectionAddress: string, tokenId: string) => {
      const key = `${collectionAddress}:${tokenId}`;
      return hiddenCollectibles[key] === "hidden";
    },
    [hiddenCollectibles],
  );

  return {
    hiddenCollectibles,
    refreshHiddenCollectibles,
    isCollectibleHidden,
    // True until this account's map has been fetched once, including after an
    // account switch, so a new account never paints with the old account's map.
    isHiddenCollectiblesLoading: loadedForKey !== publicKey,
  };
};
