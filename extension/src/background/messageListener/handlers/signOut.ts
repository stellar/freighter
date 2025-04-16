import { Store } from "redux";

import { logOut, publicKeySelector } from "background/ducks/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  APPLICATION_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";

export const signOut = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  sessionStore.dispatch(logOut());
  await localStore.remove(TEMPORARY_STORE_ID);

  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
  };
};
