import { Store } from "redux";
import { SERVICE_TYPES } from "@shared/constants/services";

import { logOut, publicKeySelector } from "background/ducks/session";
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
  sessionStore.dispatch(logOut());
  await flushSessionStore(sessionStore);
  await localStore.remove(TEMPORARY_STORE_ID);
  // Cancel any pending auto-lock alarm — the wallet is being locked
  // explicitly, so the idle timer no longer needs to fire.
  await sessionTimer.stopSession();
  await broadcastSessionState(SERVICE_TYPES.SESSION_LOCKED);

  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
  };
};
