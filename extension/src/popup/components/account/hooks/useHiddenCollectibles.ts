import { useEffect, useCallback, useRef, useState } from "react";
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
  // Which fetch the component-scoped state belongs to. Bumped per call, so a
  // request that resolves after the scope moved on can tell it is no longer
  // the current one.
  const requestIdRef = useRef(0);

  const hiddenCollectibles = useSelector((state: AppState) =>
    selectHiddenCollectiblesFor(state, networkName, publicKey),
  );

  const refreshHiddenCollectibles = useCallback(async () => {
    if (!publicKey) {
      return;
    }

    // Drop the previous scope's error before this fetch. `Account` suppresses
    // its loader once this is set, so carrying account A's failure into B --
    // whose map is still undefined -- would paint B's grid unfiltered for the
    // length of the request. The new scope waits for its own result.
    setHiddenCollectiblesError("");

    // Clearing on the way in is not enough on its own: A's request can still be
    // in flight when the switch to B happens, and would otherwise report A's
    // outcome against B below.
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

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
        if (isCurrent()) {
          setHiddenCollectiblesError(error);
        }
        captureException(`Failed to fetch hidden collectibles - ${error}`);
        return;
      }

      if (isCurrent()) {
        setHiddenCollectiblesError("");
      }
      // Dispatched even when superseded: `publicKey` and `networkName` are
      // captured from the render that started this fetch, so the map lands
      // under its own key. Discarding it would only force a refetch when that
      // scope comes back.
      dispatch(
        saveHiddenCollectibles({
          publicKey,
          networkName,
          hiddenCollectibles: hidden,
        }),
      );
    } catch (error) {
      if (isCurrent()) {
        setHiddenCollectiblesError(String(error));
      }
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
