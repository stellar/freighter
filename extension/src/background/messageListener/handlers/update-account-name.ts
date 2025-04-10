import { Store } from "redux";

import { UpdateAccountNameMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID } from "constants/localStorageTypes";
import {
  allAccountsSelector,
  updateAllAccountsAccountName,
} from "background/ducks/session";
import { addAccountName } from "background/helpers/account";

export const updateAccountName = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: UpdateAccountNameMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { accountName } = request;
  const keyId = (await localStore.getItem(KEY_ID)) || "";

  sessionStore.dispatch(
    updateAllAccountsAccountName({ updatedAccountName: accountName }),
  );
  await addAccountName({ keyId, accountName });

  return {
    allAccounts: allAccountsSelector(sessionStore.getState()),
  };
};
