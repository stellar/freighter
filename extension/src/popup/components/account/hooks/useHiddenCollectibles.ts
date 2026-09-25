import { useEffect, useCallback, useState } from "react";
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
  const [hiddenCollectiblesError, setHiddenCollectiblesError] = useState("");

  const hiddenCollectibles = useSelector((state: AppState) =>
    selectHiddenCollectiblesFor(state, networkName, publicKey),
  );

  const refreshHiddenCollectibles = useCallback(async () => {
    if (!publicKey) {
      return;
    }

    try {
      const { hiddenCollectibles: hidden, error } = await getHiddenCollectibles(
        {
          activePublicKey: publicKey,
        },
      );

      // A structured error comes back as `{ hiddenCollectibles: {}, error }` --
      // the call does not throw. Saving that empty map would record "loaded,
      // nothing hidden" and unhide every collectible for good, so leave the key
      // unwritten and let callers keep waiting.
      if (error) {
        setHiddenCollectiblesError(error);
        captureException(`Failed to fetch hidden collectibles - ${error}`);
        return;
      }

      setHiddenCollectiblesError("");
      dispatch(
        saveHiddenCollectibles({
          publicKey,
          networkName,
          hiddenCollectibles: hidden,
        }),
      );
    } catch (error) {
      setHiddenCollectiblesError(String(error));
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
    // `undefined` means this account/network has never been loaded, which is
    // not the same as "nothing hidden". It is returned as-is -- collapsing it
    // to `{}` here would make `isCollectibleHidden` answer `false` for
    // everything and paint an unfiltered grid on every cold load. Mirrors
    // HiddenAssets, which holds a loader on the same signal.
    hiddenCollectibles,
    // Guarded on `publicKey`: `refreshHiddenCollectibles` early-returns without
    // one, so there is no fetch in flight to wait for and the signal would
    // otherwise stay true forever.
    isHiddenCollectiblesLoading:
      !!publicKey && hiddenCollectibles === undefined,
    hiddenCollectiblesError,
    refreshHiddenCollectibles,
    isCollectibleHidden,
  };
};
