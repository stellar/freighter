import { Store } from "redux";
import { captureException } from "@sentry/browser";

import { SERVICE_TYPES } from "@shared/constants/services";
import { lockHardwareWallet, logOut } from "background/ducks/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { SessionTimer } from "background/helpers/session";
import { flushSessionStore } from "background/store";
import {
  APPLICATION_ID,
  ASSETS_LISTS_ID,
  AUTO_LOCK_TIMEOUT_MINUTES_ID,
  DATA_SHARING_ID,
  IS_EXPERIMENTAL_MODE_ID,
  IS_HASH_SIGNING_ENABLED_ID,
  IS_HIDE_DUST_ENABLED_ID,
  IS_NON_SSL_ENABLED_ID,
  IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
  IS_VALIDATING_MEMO_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  OVERRIDDEN_BLOCKAID_RESPONSE_ID,
  STORAGE_VERSION,
} from "constants/localStorageTypes";
import { broadcastSessionState } from "../helpers/broadcast-session-state";

/**
 * App-level settings that survive "Reset wallet". Every other key in
 * `browser.storage.local` is erased, so a key added later is erased on reset
 * until someone lists it here.
 */
export const RESET_WALLET_KEEP_LIST: readonly string[] = [
  NETWORK_ID,
  NETWORKS_LIST_ID,
  ASSETS_LISTS_ID,
  // Never remove: without it every storage migration re-runs on the next
  // extension or browser update.
  STORAGE_VERSION,
  DATA_SHARING_ID,
  IS_VALIDATING_MEMO_ID,
  IS_HIDE_DUST_ENABLED_ID,
  IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
  // The default (12 hours) is longer than almost every choice, so erasing the
  // user's setting would silently weaken their security.
  AUTO_LOCK_TIMEOUT_MINUTES_ID,
  IS_EXPERIMENTAL_MODE_ID,
  IS_HASH_SIGNING_ENABLED_ID,
  IS_NON_SSL_ENABLED_ID,
  OVERRIDDEN_BLOCKAID_RESPONSE_ID,
];

/*
  The user forgot their password and chose "Reset wallet" on the lock screen.
  Erase the wallet and everything tied to it, keeping app settings, so they
  can create or import a wallet from the Welcome screen.
*/
export const resetWallet = async ({
  localStore,
  sessionStore,
  sessionTimer,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
  sessionTimer: SessionTimer;
}) => {
  try {
    // End the session the way Log Out does. The alarm goes first so it
    // can't fire mid-reset; re-locking hardware wallets stops a leftover
    // `hw:` key id from reading as unlocked until the sweep removes it.
    await sessionTimer.stopSession();
    sessionStore.dispatch(logOut());
    sessionStore.dispatch(lockHardwareWallet());
    await flushSessionStore(sessionStore);
    await broadcastSessionState(SERVICE_TYPES.SESSION_LOCKED);

    const keysToErase = (await localStore.getAllKeys()).filter(
      (key) => key !== APPLICATION_ID && !RESET_WALLET_KEEP_LIST.includes(key),
    );
    await localStore.remove(keysToErase);
    // Last, so a failure above leaves the app locked but still onboarded and
    // the user can retry from the lock screen.
    await localStore.remove(APPLICATION_ID);
  } catch (e) {
    captureException(e);
    return { error: "Failed to reset wallet" };
  }

  return {};
};
