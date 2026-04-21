import { useEffect } from "react";
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
 */
export const useRemoteConfig = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector(isRemoteConfigInitializedSelector);

  useEffect(() => {
    if (!isInitialized) {
      dispatch(fetchFeatureFlags());
    }
  }, [dispatch, isInitialized]);
};
