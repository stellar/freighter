import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";

import { CollectibleKey } from "@shared/api/types/types";
import { getHiddenCollectibles } from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";

// Shared state store for hidden collectibles
let hiddenCollectiblesState: Record<CollectibleKey, string> = {};
let subscribers: Set<() => void> = new Set();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

// Reset function for testing purposes
export const resetHiddenCollectiblesState = () => {
  hiddenCollectiblesState = {};
  subscribers.clear();
};

export const useHiddenCollectibles = () => {
  const publicKey = useSelector(publicKeySelector);
  const [hiddenCollectibles, setHiddenCollectibles] = useState<
    Record<CollectibleKey, string>
  >(hiddenCollectiblesState);

  // Subscribe to state changes
  useEffect(() => {
    const callback = () => {
      setHiddenCollectibles(hiddenCollectiblesState);
    };
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  const refreshHiddenCollectibles = useCallback(async () => {
    if (!publicKey) {
      hiddenCollectiblesState = {};
      notifySubscribers();
      return;
    }

    try {
      const { hiddenCollectibles: hidden } = await getHiddenCollectibles({
        activePublicKey: publicKey,
      });
      hiddenCollectiblesState = hidden || {};
      notifySubscribers();
    } catch (error) {
      console.error("Failed to fetch hidden collectibles:", error);
      hiddenCollectiblesState = {};
      notifySubscribers();
    }
  }, [publicKey]);

  // Fetch on mount if state is empty
  useEffect(() => {
    if (Object.keys(hiddenCollectiblesState).length === 0) {
      refreshHiddenCollectibles();
    }
  }, [refreshHiddenCollectibles]);

  return {
    hiddenCollectibles,
    refreshHiddenCollectibles,
  };
};
