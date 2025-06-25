import { Store } from "redux";

import { UpdateAccountNameMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  allAccountsSelector,
  updateAccountName as updateAccountNameAction,
} from "background/ducks/session";
import { addAccountName, getKeyIdList } from "background/helpers/account";
import { Account } from "@shared/api/types";

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

  sessionStore.dispatch(
    updateAccountNameAction({ updatedAccountName: accountName, publicKey }),
  );
  const allAccounts = allAccountsSelector(sessionStore.getState());
  let publicKeyIndex = allAccounts.findIndex(
    (account: Account) => account.publicKey === publicKey,
  );
  publicKeyIndex = publicKeyIndex > -1 ? publicKeyIndex : 0;

  const keyIdList = await getKeyIdList({ localStore });

  const keyId = keyIdList[publicKeyIndex];
  await addAccountName({ keyId, accountName, localStore });

  return {
    allAccounts: allAccountsSelector(sessionStore.getState()),
  };
};
