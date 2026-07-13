import { useEffect, useRef } from "react";
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

  // Mirror `location` into a ref so the `runtime.onMessage` listener
  // can read the latest value without being a dependency of the
  // effect that registers it. Without this the listener would be
  // re-registered on every navigation — functionally fine (the
  // cleanup unregisters first), but unnecessary churn on a hot path.
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

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

      const currentLocation = locationRef.current;

      if (type === SERVICE_TYPES.SESSION_LOCKED) {
        // Always flip the popup's redux to locked state — even if we're
        // already on /unlock-account. Without this dispatch the surface
        // keeps `hasPrivateKey: true` in redux while the background
        // session is locked, and `<ActivityTracker>` continues sending
        // `USER_ACTIVITY` pings (which are no-ops once the background
        // is locked, but still wasted IPC and a misleading signal).
        dispatch(lockAccount());
        // Skip the navigate only when we're already on the unlock
        // screen. That avoids clobbering an existing `state.from` set
        // by an earlier reroute (e.g. a sign-transaction flow that
        // already rerouted here and stored the original destination).
        if (currentLocation.pathname === ROUTES.unlockAccount) return undefined;
        navigate(`${ROUTES.unlockAccount}${currentLocation.search}`, {
          state: { from: currentLocation },
        });
        return undefined;
      }

      // SESSION_UNLOCKED. Refresh this surface's auth state so passive
      // surfaces (e.g. sidebar parked on /unlock-account) reflect the
      // unlocked wallet. We deliberately do NOT navigate here:
      // `runtime.sendMessage` is broadcast by the background to every
      // extension context including the popup that *initiated* the
      // unlock via `confirmPassword`, so navigating from this listener
      // would race the unlock view's own post-submit navigation (and
      // in the grant-access flow would land the user on /account
      // instead of /grant-access). The unlock screens watch
      // `hasPrivateKey` and navigate themselves once auth state
      // flips, which covers both the active and passive surfaces.
      void (async () => {
        try {
          const account = await loadAccount();
          // Guard against a missing/undefined background response. MV3
          // service-worker restarts and transient handler errors can
          // resolve `loadAccount()` to `undefined`; dispatching that
          // into `saveAccount` hits the destructuring reducer and
          // throws `TypeError: Cannot destructure property
          // 'hasPrivateKey' of 'undefined'`. Treat as a no-op — the
          // next genuine auth event will refresh the surface.
          if (!account) return;
          dispatch(saveAccount(account));
        } catch (e) {
          // An uncaught rejection here becomes an unhandled promise
          // rejection that crashes the surface. Log and drop — the
          // background remains the source of truth.
          console.error("SessionLockListener: loadAccount failed", e);
        }
      })();
      return undefined;
    };

    browser.runtime.onMessage.addListener(handler);
    return () => {
      browser.runtime.onMessage.removeListener(handler);
    };
  }, [dispatch, navigate]);

  return null;
};
