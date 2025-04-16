import { Store } from "redux";

import {
  allAccountsSelector,
  setActivePublicKey,
} from "background/ducks/session";
import { Account } from "@shared/api/types";
import { getKeyIdList } from "background/helpers/account";
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
  const allAccounts = allAccountsSelector(sessionStore.getState());
  let publicKeyIndex = allAccounts.findIndex(
    (account: Account) => account.publicKey === publicKey,
  );
  publicKeyIndex = publicKeyIndex > -1 ? publicKeyIndex : 0;

  const keyIdList = await getKeyIdList({ localStore });

  const activeKeyId = keyIdList[publicKeyIndex];

  await localStore.setItem(KEY_ID, activeKeyId);

  await sessionStore.dispatch(
    setActivePublicKey({ publicKey, localStore }) as any,
  );
};
