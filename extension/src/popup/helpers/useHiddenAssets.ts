import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { AssetVisibility, IssuerKey } from "@shared/api/types";
import { changeAssetVisibility, getHiddenAssets } from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { isAssetVisible } from "popup/helpers/settings";

/**
 * The active account's hidden-assets map (canonical asset -> visibility),
 * kept in sync with the background's `HIDDEN_ASSETS` storage. Mirrors
 * `useHiddenCollectibles`.
 */
export const useHiddenAssets = () => {
  const publicKey = useSelector(publicKeySelector);
  const [hiddenAssets, setHiddenAssets] = useState<
    Record<IssuerKey, AssetVisibility>
  >({});

  const refreshHiddenAssets = useCallback(async () => {
    if (!publicKey) {
      setHiddenAssets({});
      return;
    }

    try {
      const { hiddenAssets: hidden } = await getHiddenAssets({
        activePublicKey: publicKey,
      });
      setHiddenAssets(hidden || {});
    } catch (error) {
      console.error("Failed to fetch hidden assets:", error);
      setHiddenAssets({});
    }
  }, [publicKey]);

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
      });

      if (error) {
        throw new Error(error);
      }

      setHiddenAssets(next || {});
    },
    [publicKey],
  );

  return {
    hiddenAssets,
    refreshHiddenAssets,
    isAssetHidden,
    setAssetVisibility,
  };
};

/**
 * Drops a stored hidden flag for an asset the user just added, so it shows
 * up. The hidden map is keyed by canonical asset and outlives a trustline or
 * local entry, so a flag left from before a removal would hide the re-added
 * token on arrival. Writes only when the asset is actually hidden, and never
 * throws: the add already succeeded, so a failed cleanup must not fail it.
 */
export const clearHiddenAssetFlag = async ({
  canonicalAsset,
  activePublicKey,
}: {
  canonicalAsset: string;
  activePublicKey: string;
}): Promise<void> => {
  try {
    const { hiddenAssets, error } = await getHiddenAssets({ activePublicKey });

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
    });

    if (writeError) {
      throw new Error(writeError);
    }
  } catch (error) {
    console.error("Failed to clear hidden flag after add:", error);
  }
};

/**
 * The wallet's hidden-assets map for one-off reads outside a component, or
 * an empty map when it can't be read: callers then show hidden assets
 * rather than fail. Never throws.
 */
export const readHiddenAssets = async (
  activePublicKey: string,
): Promise<Record<IssuerKey, AssetVisibility>> => {
  if (!activePublicKey) {
    return {};
  }

  try {
    const { hiddenAssets, error } = await getHiddenAssets({ activePublicKey });

    if (error) {
      throw new Error(error);
    }

    return hiddenAssets || {};
  } catch (error) {
    console.error("Failed to read hidden assets:", error);
    return {};
  }
};
