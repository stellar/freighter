import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";

import { CollectibleKey } from "@shared/api/types/types";
import { getHiddenCollectibles } from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

/**
 * Hidden collectibles for the active account and network.
 */
export const useHiddenCollectibles = () => {
  const publicKey = useSelector(publicKeySelector);
  const { network } = useSelector(settingsNetworkDetailsSelector);
  const scopeKey = `${publicKey}:${network}`;
  const [hiddenCollectibles, setHiddenCollectibles] = useState<
    Record<CollectibleKey, string>
  >({});
  // Which account and network the map on hand belongs to. The grid filters
  // against the map, so painting before the first fetch for a scope lands
  // flashes its hidden collectibles into view; later refreshes (hide, unhide,
  // close) keep the current map on screen rather than spinning.
  const [loadedForKey, setLoadedForKey] = useState<string | null>(null);
  // Bumped by every read so a slow read for a previous account or network
  // can't land after a newer one and show the wrong list.
  const generationRef = useRef(0);

  const refreshHiddenCollectibles = useCallback(async () => {
    const generation = ++generationRef.current;

    if (!publicKey) {
      setHiddenCollectibles({});
      setLoadedForKey(scopeKey);
      return;
    }

    let hidden: Record<CollectibleKey, string> = {};

    try {
      ({ hiddenCollectibles: hidden } = await getHiddenCollectibles({
        activePublicKey: publicKey,
        network,
      }));
    } catch (error) {
      console.error("Failed to fetch hidden collectibles:", error);
    }

    if (generation !== generationRef.current) {
      return;
    }

    setHiddenCollectibles(hidden || {});
    // A failed fetch counts as loaded: an unfiltered grid beats a loader
    // that never resolves.
    setLoadedForKey(scopeKey);
  }, [publicKey, network, scopeKey]);

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
    // True until this account and network's map has been fetched once,
    // including after a switch, so a new scope never paints with the old map.
    isHiddenCollectiblesLoading: loadedForKey !== scopeKey,
  };
};
