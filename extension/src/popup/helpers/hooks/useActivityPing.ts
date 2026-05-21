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

/**
 * Ping the background with USER_ACTIVITY messages whenever the user
 * interacts with the extension page, while the wallet is unlocked.
 * Uses a leading-edge throttle so a single ping fires on the first
 * event in each `PING_THROTTLE_MS` window — accurate to ~8 % on the
 * 1-minute preset and effectively noise at higher presets.
 */
export const useActivityPing = (isUnlocked: boolean) => {
  useEffect(() => {
    if (!isUnlocked) return undefined;

    let lastPingAt = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastPingAt < PING_THROTTLE_MS) return;
      lastPingAt = now;
      void sendMessageToBackground({
        type: SERVICE_TYPES.USER_ACTIVITY,
        // `USER_ACTIVITY` is account-agnostic — the background only
        // cares that *some* extension page is active, not which key is
        // selected. Send an empty string (rather than null) to match
        // `BaseMessage`'s `activePublicKey: string` typing; the
        // background's mismatch check (`if (request.activePublicKey
        // && …)`) treats empty-string as "skip the check", same as
        // the previous null.
        activePublicKey: "",
      });
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
