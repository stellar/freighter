import { Store } from "redux";

import {
  allAccountsSelector,
  setActivePublicKey,
} from "background/ducks/session";
import { findAccount } from "background/helpers/account";
import { KEY_ID } from "constants/localStorageTypes";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

/**
 * Makes one account active. Pass `id` whenever the caller has it: a public
 * key alone resolves to the first account with that address, which is the
 * wrong one when a hot account and a Ledger share it.
 */
export const activatePublicKey = async ({
  id,
  publicKey,
  sessionStore,
  localStore,
}: {
  id?: string;
  publicKey?: string;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  // Resolve before touching anything: an unknown account throws and leaves
  // the active account as it was.
  const account = findAccount(allAccountsSelector(sessionStore.getState()), {
    id,
    publicKey,
  });

  await localStore.setItem(KEY_ID, account.id);

  await sessionStore.dispatch(
    setActivePublicKey({ publicKey: account.publicKey, localStore }) as any,
  );
};
