import { getKeyIdList } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  ACCOUNT_NAME_LIST_ID,
  APPLICATION_ID,
  KEY_ID_LIST,
  LAST_USED_ACCOUNT,
  RECENT_ADDRESSES,
  TOKEN_ID_LIST,
} from "constants/localStorageTypes";

/* 
  The user has lost their password and they want to reimport an account.
  Remove all references to the previous account in localStore so the user has a clean slate to start over.
  */
export const removePreviousAccount = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  await localStore.remove(ACCOUNT_NAME_LIST_ID);
  await localStore.remove(APPLICATION_ID);
  await localStore.remove(RECENT_ADDRESSES);
  await localStore.remove(LAST_USED_ACCOUNT);
  await localStore.remove(TOKEN_ID_LIST);

  const keyIdList = await getKeyIdList({ localStore });

  for (let i = 0; i < keyIdList.length; i += 1) {
    const k = keyIdList[i];
    await localStore.remove(`stellarkeys:${k}`);
  }

  await localStore.remove(KEY_ID_LIST);
};
