import { Store } from "redux";

import { UpdateAccountNameMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  allAccountsSelector,
  updateAccountName as updateAccountNameAction,
} from "background/ducks/session";
import {
  addAccountName,
  findAccountByPublicKey,
} from "background/helpers/account";

export const updateAccountName = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: UpdateAccountNameMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { accountName, publicKey } = request;

  // Resolve before touching anything: an unknown key throws and leaves both
  // the session and the stored names as they were.
  const { id } = findAccountByPublicKey(
    allAccountsSelector(sessionStore.getState()),
    publicKey,
  );

  await addAccountName({ keyId: id, accountName, localStore });
  sessionStore.dispatch(
    updateAccountNameAction({ updatedAccountName: accountName, publicKey }),
  );

  return {
    allAccounts: allAccountsSelector(sessionStore.getState()),
  };
};
