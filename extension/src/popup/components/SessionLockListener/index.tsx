import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import browser from "webextension-polyfill";

import { loadAccount } from "@shared/api/internal";
import { SERVICE_TYPES } from "@shared/constants/services";
import { ROUTES } from "popup/constants/routes";
import { lockAccount, saveAccount } from "popup/ducks/accountServices";

/**
 * Listens for the background's `SESSION_LOCKED` broadcast (fired when
 * the idle auto-lock alarm elapses) and flips the popup over to the
 * unlock screen immediately, instead of leaving stale account/asset
 * views on screen until the next data refetch.
 *
 * Mounted inside `<HashRouter>` so it can use `useNavigate` /
 * `useLocation`. Every Freighter UI surface (popup, sidebar, standalone
 * signing window, grant-access window) renders the same `<App>` →
 * `<Router>` tree, so one mount covers all of them.
 *
 * When navigating to the unlock screen we preserve the current
 * `location` (as `state.from`) and `location.search`, mirroring the
 * pattern used by `<SignTransaction>` / `<GrantAccess>` reroutes. After
 * a successful unlock, `<UnlockAccount>` reads `state.from.pathname` +
 * `location.search` and returns the user to the interrupted flow
 * (e.g. `/grant-access?...`, `/sign-transaction?...`) rather than
 * stranding them on the default account page.
 */
export const SessionLockListener = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = async (message: unknown) => {
      if (typeof message !== "object" || message === null) return undefined;
      const { type } = message as { type?: unknown };
      if (type === SERVICE_TYPES.SESSION_LOCKED) {
        // Already on the unlock screen — nothing to do. Avoids clobbering
        // an existing `state.from` set by an earlier reroute.
        if (location.pathname === ROUTES.unlockAccount) return undefined;
        dispatch(lockAccount());
        navigate(`${ROUTES.unlockAccount}${location.search}`, {
          state: { from: location },
        });
        return undefined;
      }
      if (type !== SERVICE_TYPES.SESSION_UNLOCKED) return undefined;

      const account = await loadAccount();
      dispatch(saveAccount(account));
      if (
        location.pathname === ROUTES.unlockAccount ||
        location.pathname === ROUTES.verifyAccount
      ) {
        navigate(ROUTES.account, { replace: true });
      }
      return undefined;
    };

    browser.runtime.onMessage.addListener(handler);
    return () => {
      browser.runtime.onMessage.removeListener(handler);
    };
  }, [dispatch, navigate, location]);

  return null;
};
