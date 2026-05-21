import { Store } from "redux";

import { logOut, publicKeySelector } from "background/ducks/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { SessionTimer } from "background/helpers/session";
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
  sessionStore.dispatch(logOut());
  await localStore.remove(TEMPORARY_STORE_ID);
  // Cancel any pending auto-lock alarm — the wallet is being locked
  // explicitly, so the idle timer no longer needs to fire.
  await sessionTimer.stopSession();

  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
  };
};
