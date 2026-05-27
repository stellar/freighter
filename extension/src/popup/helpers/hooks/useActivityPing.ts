import { useEffect } from "react";

import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";

const PING_THROTTLE_MS = 5_000;

// We deliberately do NOT listen for `scroll`: Freighter's layouts use
// inner overflow containers (e.g. `popup/basics/layout/View`) where
// `scroll` does not bubble to `window`. `wheel` does bubble for mouse
// scrolling, and pointer/keyboard-driven scrolling already fires
// `mousedown` / `keydown`.
const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "wheel",
] as const;

const sendPing = () => {
  // eslint-disable-next-line no-console
  console.warn("[auto-lock] popup sendPing called", { ts: Date.now() });
  sendMessageToBackground({
    type: SERVICE_TYPES.USER_ACTIVITY,
    // `USER_ACTIVITY` is account-agnostic — the background only cares
    // that *some* extension page is active, not which key is selected.
    // Send an empty string (rather than null) to match `BaseMessage`'s
    // `activePublicKey: string` typing; the background's mismatch
    // check (`if (request.activePublicKey && …)`) treats empty-string
    // as "skip the check", same as the previous null.
    activePublicKey: "",
  })
    .then((res) => {
      // eslint-disable-next-line no-console
      console.warn("[auto-lock] popup sendPing response", res);
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.warn("[auto-lock] popup sendPing error", e);
    });
};

/**
 * Ping the background with USER_ACTIVITY messages whenever the user
 * interacts with the extension page, while the wallet is unlocked.
 * Uses a leading-edge throttle so a single ping fires on the first
 * event in each `PING_THROTTLE_MS` window — accurate to ~8 % on the
 * 1-minute preset and effectively noise at higher presets.
 *
 * Also pings once on mount of every Freighter surface (popup, sidebar,
 * fullscreen), unconditionally. Opening a Freighter UI is itself a
 * user-initiated action, and the background-side `userActivity`
 * handler is the authoritative gate that decides whether the wallet
 * is actually unlocked before rearming the alarm — so the popup
 * doesn't need to second-guess its own redux state, which can lag
 * behind the background (e.g. before `loadAccount` has hydrated
 * `hasPrivateKey`). Without firing on mount, a user whose dApp opens
 * a new popup mid-session can be locked out mid-flow because the new
 * surface's redux store hasn't caught up to the background's session
 * state in time to satisfy the previous `isUnlocked` gate.
 */
export const useActivityPing = (isUnlocked: boolean) => {
  // Mount ping: fire-and-forget, exactly once per surface mount,
  // regardless of the popup-side `isUnlocked` signal. The background
  // gates whether to actually rearm the alarm on the authoritative
  // session state.
  useEffect(() => {
    sendPing();
  }, []);

  // Event-driven pings: only while unlocked. No-op when locked so
  // stray scrolls/clicks on the unlock screen don't generate traffic.
  useEffect(() => {
    if (!isUnlocked) return undefined;

    let lastPingAt = Date.now();
    const handler = () => {
      const now = Date.now();
      if (now - lastPingAt < PING_THROTTLE_MS) return;
      lastPingAt = now;
      sendPing();
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, handler, { passive: true });
    }
    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, handler);
      }
    };
  }, [isUnlocked]);
};
