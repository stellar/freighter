import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { AppDispatch } from "popup/App";
import {
  fetchFeatureFlags,
  isRemoteConfigInitializedSelector,
} from "popup/ducks/remoteConfig";

/**
 * Fetches Amplitude Experiment flags once when the popup opens.
 *
 * The extension popup is ephemeral — it opens and closes on each click — so
 * polling is unnecessary. Flags refresh naturally every time the user opens
 * the wallet.
 *
 * Uses an `isMounted` ref to guard against state updates after unmount,
 * and aborts the in-flight thunk on cleanup.
 */
export const useRemoteConfig = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector(isRemoteConfigInitializedSelector);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized && isMounted.current) {
      const promise = dispatch(fetchFeatureFlags());
      return () => {
        promise.abort();
      };
    }
    return undefined;
  }, [dispatch, isInitialized]);
};
