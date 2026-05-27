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
    // IMPORTANT: this handler must be a *synchronous* function. Every
    // Freighter UI surface (popup, sidebar, fullscreen) registers a
    // `runtime.onMessage` listener, and `browser.runtime.sendMessage`
    // broadcasts to every extension context except the sender. If this
    // handler were `async`, it would always return a Promise — which
    // Chrome interprets as "this listener will produce the response" —
    // and could win the race against the background's own handler for
    // any unrelated request (e.g. `LOAD_ACCOUNT`,
    // `GET_IS_ACCOUNT_MISMATCH`) sent by another surface. The sender
    // would then receive `undefined` from this listener instead of the
    // real background payload, surfacing as crashes like
    // "Cannot read properties of null (reading 'publicKey')".
    //
    // To stay out of the response slot for unrelated messages we
    // return `undefined` synchronously below. For our two broadcast
    // types we still don't claim the response slot (the background's
    // broadcast doesn't await any reply); the SESSION_UNLOCKED
    // `loadAccount` round-trip runs as a fire-and-forget side effect.
    const handler = (message: unknown) => {
      if (typeof message !== "object" || message === null) return undefined;
      const { type } = message as { type?: unknown };
      if (
        type !== SERVICE_TYPES.SESSION_LOCKED &&
        type !== SERVICE_TYPES.SESSION_UNLOCKED
      ) {
        return undefined;
      }

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

      void (async () => {
        const account = await loadAccount();
        dispatch(saveAccount(account));
        if (
          location.pathname === ROUTES.unlockAccount ||
          location.pathname === ROUTES.verifyAccount
        ) {
          navigate(ROUTES.account, { replace: true });
        }
      })();
      return undefined;
    };

    browser.runtime.onMessage.addListener(handler);
    return () => {
      browser.runtime.onMessage.removeListener(handler);
    };
  }, [dispatch, navigate, location]);

  return null;
};
