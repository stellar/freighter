import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { AssetVisibility, IssuerKey } from "@shared/api/types";
import { changeAssetVisibility, getHiddenAssets } from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isAssetVisible } from "popup/helpers/settings";

/**
 * Hidden assets for the active account and network.
 */
export const useHiddenAssets = () => {
  const publicKey = useSelector(publicKeySelector);
  const { network } = useSelector(settingsNetworkDetailsSelector);
  const [hiddenAssets, setHiddenAssets] = useState<
    Record<IssuerKey, AssetVisibility>
  >({});
  // Bumped by every read and write so a slow read for a previous account or
  // network can't land after a newer one and show the wrong list.
  const generationRef = useRef(0);

  const refreshHiddenAssets = useCallback(async () => {
    const generation = ++generationRef.current;

    if (!publicKey) {
      setHiddenAssets({});
      return;
    }

    try {
      const { hiddenAssets: hidden } = await getHiddenAssets({
        activePublicKey: publicKey,
        network,
      });
      if (generation === generationRef.current) {
        setHiddenAssets(hidden || {});
      }
    } catch (error) {
      console.error("Failed to fetch hidden assets:", error);
      if (generation === generationRef.current) {
        setHiddenAssets({});
      }
    }
  }, [publicKey, network]);

  useEffect(() => {
    refreshHiddenAssets();
  }, [refreshHiddenAssets]);

  const isAssetHidden = useCallback(
    (canonicalAsset: string) => !isAssetVisible(hiddenAssets, canonicalAsset),
    [hiddenAssets],
  );

  /**
   * Persists a visibility change and updates the local map from the
   * background's response.
   *
   * @throws when the background reports an error
   */
  const setAssetVisibility = useCallback(
    async (canonicalAsset: string, visibility: AssetVisibility) => {
      const { hiddenAssets: next, error } = await changeAssetVisibility({
        assetIssuer: canonicalAsset,
        assetVisibility: visibility,
        activePublicKey: publicKey,
        network,
      });

      if (error) {
        throw new Error(error);
      }

      // The write's response is the newest state; drop any read in flight.
      generationRef.current += 1;
      setHiddenAssets(next || {});
    },
    [publicKey, network],
  );

  return {
    hiddenAssets,
    refreshHiddenAssets,
    isAssetHidden,
    setAssetVisibility,
  };
};

/**
 * Unhides an asset the user just added, since a hidden flag outlives its
 * removal. Never throws, so a failed cleanup can't fail the add.
 */
export const clearHiddenAssetFlag = async ({
  canonicalAsset,
  activePublicKey,
  network,
}: {
  canonicalAsset: string;
  activePublicKey: string;
  network: string;
}): Promise<void> => {
  try {
    const { hiddenAssets, error } = await getHiddenAssets({
      activePublicKey,
      network,
    });

    if (error) {
      throw new Error(error);
    }

    if (isAssetVisible(hiddenAssets, canonicalAsset)) {
      return;
    }

    const { error: writeError } = await changeAssetVisibility({
      assetIssuer: canonicalAsset,
      assetVisibility: "visible",
      activePublicKey,
      network,
    });

    if (writeError) {
      throw new Error(writeError);
    }
  } catch (error) {
    console.error("Failed to clear hidden flag after add:", error);
  }
};

/**
 * One-off read of the active account's hidden assets. Returns an empty map
 * on error. Never throws.
 */
export const readHiddenAssets = async (
  activePublicKey: string,
  network: string,
): Promise<Record<IssuerKey, AssetVisibility>> => {
  if (!activePublicKey) {
    return {};
  }

  try {
    const { hiddenAssets, error } = await getHiddenAssets({
      activePublicKey,
      network,
    });

    if (error) {
      throw new Error(error);
    }

    return hiddenAssets || {};
  } catch (error) {
    console.error("Failed to read hidden assets:", error);
    return {};
  }
};
