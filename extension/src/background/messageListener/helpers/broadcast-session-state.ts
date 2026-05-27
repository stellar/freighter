import browser from "webextension-polyfill";

import { SERVICE_TYPES } from "@shared/constants/services";

export const broadcastSessionState = async (
  type: SERVICE_TYPES.SESSION_LOCKED | SERVICE_TYPES.SESSION_UNLOCKED,
): Promise<void> => {
  try {
    await browser.runtime.sendMessage({ type });
  } catch {
    // No receivers — harmless.
  }
};
