import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { loadSettings } from "@shared/api/internal";
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
 * The data-sharing setting is read from the background rather than the
 * settings slice: the slice holds a `false` placeholder until a view
 * hydrates it, and the screens with no account data (onboarding, the lock
 * screen) never do, while hydrating it from here would switch on the
 * analytics that key off it. If the read fails the fetch goes out anonymous.
 */
export const useRemoteConfig = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector(isRemoteConfigInitializedSelector);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (isInitialized || hasFetched.current) return;
    hasFetched.current = true;
    loadSettings()
      .then((settings) =>
        dispatch(
          fetchFeatureFlags({
            isDataSharingAllowed: settings.isDataSharingAllowed,
          }),
        ),
      )
      .catch((e) => {
        captureException(e, {
          extra: { context: "useRemoteConfig: failed to load settings" },
        });
        dispatch(fetchFeatureFlags({ isDataSharingAllowed: false }));
      });
  }, [dispatch, isInitialized]);
};
