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

  const refreshHiddenCollectibles = useCallback(async () => {
    if (!publicKey) {
      setHiddenCollectibles({});
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
  };
};
