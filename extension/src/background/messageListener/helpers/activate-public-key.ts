import { Store } from "redux";

import {
  allAccountsSelector,
  setActivePublicKey,
} from "background/ducks/session";
import { findAccountByPublicKey } from "background/helpers/account";
import { KEY_ID } from "constants/localStorageTypes";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const activatePublicKey = async ({
  publicKey,
  sessionStore,
  localStore,
}: {
  publicKey: string;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  // Resolve before touching anything: an unknown key throws and leaves the
  // active account as it was.
  const { id } = findAccountByPublicKey(
    allAccountsSelector(sessionStore.getState()),
    publicKey,
  );

  await localStore.setItem(KEY_ID, id);

  await sessionStore.dispatch(
    setActivePublicKey({ publicKey, localStore }) as any,
  );
};
