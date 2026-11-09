import { Store } from "redux";

import { UpdateAccountNameMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  allAccountsSelector,
  updateAccountName as updateAccountNameAction,
} from "background/ducks/session";
import { addAccountName, findAccountById } from "background/helpers/account";

export const updateAccountName = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: UpdateAccountNameMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { accountName, id } = request;

  // Resolve by id, never by public key: two accounts can share an address.
  // An unknown id throws and leaves both the session and the stored names as
  // they were.
  findAccountById(allAccountsSelector(sessionStore.getState()), id);

  await addAccountName({ keyId: id, accountName, localStore });
  sessionStore.dispatch(
    updateAccountNameAction({ updatedAccountName: accountName, id }),
  );

  return {
    allAccounts: allAccountsSelector(sessionStore.getState()),
  };
};
