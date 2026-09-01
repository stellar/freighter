import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import {
  getHasSeenEarnIntro,
  dismissEarnIntro as dismissEarnIntroApi,
} from "@shared/api/internal";
import { earnSelector, setEarnIntroSeen } from "popup/ducks/earn";

/**
 * Reads and writes the persisted "has seen the Earn interstitial" flag.
 *
 * The flag lives in the background store rather than popup localStorage,
 * following the Discover welcome precedent — the popup's storage is not a
 * durable place for a once-ever decision.
 *
 * The resolved value goes into the `earn` duck rather than local state so the
 * Earn view can distinguish "not yet known" (null) from "known false", and only
 * show the interstitial once it is genuinely the latter.
 */
export const useEarnIntroSeen = () => {
  const dispatch = useDispatch();
  const { hasSeenIntro } = useSelector(earnSelector);

  useEffect(() => {
    if (hasSeenIntro !== null) {
      return;
    }

    const check = async () => {
      try {
        dispatch(setEarnIntroSeen(await getHasSeenEarnIntro()));
      } catch (error) {
        // Default to "seen" on a messaging failure: showing the interstitial to
        // someone who already dismissed it is the worse of the two outcomes.
        captureException(`Error checking Earn intro flag - ${error}`);
        dispatch(setEarnIntroSeen(true));
      }
    };

    check();
  }, [dispatch, hasSeenIntro]);

  const dismissIntro = useCallback(async () => {
    dispatch(setEarnIntroSeen(true));
    try {
      await dismissEarnIntroApi();
    } catch (error) {
      captureException(`Error dismissing Earn intro - ${error}`);
    }
  }, [dispatch]);

  return { hasSeenIntro, dismissIntro };
};
