import { Store } from "redux";
import { SERVICE_TYPES } from "@shared/constants/services";

import {
  lockHardwareWallet,
  logOut,
  publicKeySelector,
} from "background/ducks/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { SessionTimer } from "background/helpers/session";
import { broadcastSessionState } from "../helpers/broadcast-session-state";
import { flushSessionStore } from "background/store";
import {
  APPLICATION_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";

export const signOut = async ({
  localStore,
  sessionStore,
  sessionTimer,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
  sessionTimer: SessionTimer;
}) => {
  // Cancel any pending auto-lock alarm FIRST — the wallet is being
  // locked explicitly, so the idle timer no longer needs to fire.
  // Clearing before mutating state eliminates the race window where
  // a pending alarm could fire `clearSession` on already-cleared
  // state and emit a duplicate SESSION_LOCKED broadcast.
  await sessionTimer.stopSession();
  sessionStore.dispatch(logOut());
  // `logOut` resets session state to `initialState`, which sets
  // `isHardwareWalletLocked: false`. The KEY_ID (`hw:…` prefix) is
  // intentionally not cleared on sign-out (so the HW account can be
  // re-unlocked without re-importing), which means
  // `getIsHardwareWalletActive` still reports `true`. Without this
  // dispatch, `buildHasPrivateKeySelector`'s HW branch would report
  // the wallet UNLOCKED for HW users immediately after sign-out.
  sessionStore.dispatch(lockHardwareWallet());
  await flushSessionStore(sessionStore);
  await localStore.remove(TEMPORARY_STORE_ID);
  await broadcastSessionState(SERVICE_TYPES.SESSION_LOCKED);

  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
  };
};
