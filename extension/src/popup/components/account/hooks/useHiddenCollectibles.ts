import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { getHiddenCollectibles } from "@shared/api/internal";
import { AppDispatch, AppState } from "popup/App";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  saveHiddenCollectibles,
  selectHiddenCollectiblesFor,
} from "popup/ducks/hiddenCollectibles";

/**
 * Hidden-collectible visibility for the active account on the active network.
 *
 * Backed by redux rather than local state: this hook is mounted independently
 * by Account and AddCollectibles, and with `useState` each mount held its own
 * copy, so a hide in one was invisible to the other until it refetched. The
 * store is keyed by network + public key, so switching either is just a
 * different key -- no invalidation, and no stale read.
 */
export const useHiddenCollectibles = () => {
  const dispatch = useDispatch<AppDispatch>();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { networkName } = networkDetails;

  const hiddenCollectibles = useSelector((state: AppState) =>
    selectHiddenCollectiblesFor(state, networkName, publicKey),
  );

  const refreshHiddenCollectibles = useCallback(async () => {
    if (!publicKey) {
      return;
    }

    try {
      const { hiddenCollectibles: hidden } = await getHiddenCollectibles({
        activePublicKey: publicKey,
      });
      dispatch(
        saveHiddenCollectibles({
          publicKey,
          networkName,
          hiddenCollectibles: hidden,
        }),
      );
    } catch (error) {
      captureException(`Failed to fetch hidden collectibles - ${error}`);
    }
    // networkName is a dependency on purpose: the background resolves the
    // network itself, so a switch returns a different map and it has to land
    // under the new key.
  }, [dispatch, publicKey, networkName]);

  useEffect(() => {
    refreshHiddenCollectibles();
  }, [refreshHiddenCollectibles]);

  const isCollectibleHidden = useCallback(
    (collectionAddress: string, tokenId: string) =>
      hiddenCollectibles?.[`${collectionAddress}:${tokenId}`] === "hidden",
    [hiddenCollectibles],
  );

  return {
    // `undefined` means "not loaded yet"; callers only ever ask whether a
    // specific collectible is hidden, for which an empty map is the right
    // answer while the first fetch is in flight.
    hiddenCollectibles: hiddenCollectibles || {},
    refreshHiddenCollectibles,
    isCollectibleHidden,
  };
};
