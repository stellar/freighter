import { getKeyIdList } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  ACCOUNT_NAME_LIST_ID,
  APPLICATION_ID,
  RECENT_ADDRESSES,
  LAST_USED_ACCOUNT,
  TOKEN_ID_LIST,
  KEY_ID_LIST,
} from "constants/localStorageTypes";

export const clearAccount = async (store: DataStorageAccess) => {
  await store.remove(ACCOUNT_NAME_LIST_ID);
  await store.remove(APPLICATION_ID);
  await store.remove(RECENT_ADDRESSES);
  await store.remove(LAST_USED_ACCOUNT);
  await store.remove(TOKEN_ID_LIST);

  const keyIdList = await getKeyIdList();

  for (let i = 0; i < keyIdList.length; i += 1) {
    const k = keyIdList[i];
    await store.remove(`stellarkeys:${k}`);
  }

  await store.remove(KEY_ID_LIST);
};
