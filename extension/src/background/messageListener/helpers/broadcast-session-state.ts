import browser from "webextension-polyfill";

import { SERVICE_TYPES } from "@shared/constants/services";

// Chrome's runtime.sendMessage rejects with this message whenever no
// extension contexts are listening for the broadcast. That is the
// common case (e.g. the user has every Freighter surface closed when
// the idle alarm fires) and is harmless. Anything else is unexpected
// and worth logging so it doesn't get silently swallowed.
const NO_RECEIVER_PATTERNS = [
  "Could not establish connection",
  "Receiving end does not exist",
];

export const broadcastSessionState = async (
  type: SERVICE_TYPES.SESSION_LOCKED | SERVICE_TYPES.SESSION_UNLOCKED,
): Promise<void> => {
  try {
    await browser.runtime.sendMessage({ type });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!NO_RECEIVER_PATTERNS.some((p) => message.includes(p))) {
      console.warn(`broadcastSessionState(${type}) failed:`, e);
    }
  }
};
