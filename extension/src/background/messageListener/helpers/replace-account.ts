import { Store } from "redux";

import { KeyPair } from "@shared/api/types/message-request";
import { allAccountsSelector, logIn } from "background/ducks/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  KeyManager,
  KeyType,
  ScryptEncrypter,
} from "@stellar/typescript-wallet-sdk-km";
import { addAccountName, getKeyIdList } from "background/helpers/account";
import { KEY_ID, KEY_ID_LIST } from "constants/localStorageTypes";

/*
  _replaceAccount is only used during the migration process. It is analagous to _storeAccount above.
  1. We login with the new account, which sets the new active public key and new allAccounts in Redux for the UI to consume
  2. We save the key store in storage
  3. We save the new account name in storage
*/
export const replaceAccount = async ({
  args: { mnemonicPhrase, password, keyPair, indexToReplace },
  localStore,
  sessionStore,
  keyManager,
}: {
  args: {
    mnemonicPhrase: string;
    password: string;
    keyPair: KeyPair;
    indexToReplace: number;
  };
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
}) => {
  const { publicKey, privateKey } = keyPair;

  const allAccounts = allAccountsSelector(sessionStore.getState());
  const accountName = `Account ${indexToReplace + 1}`;
  const newAllAccounts = [...allAccounts];

  newAllAccounts[indexToReplace] = {
    publicKey,
    name: accountName,
    imported: false,
  };

  await sessionStore.dispatch(
    logIn({
      publicKey,
      allAccounts: newAllAccounts,
    }) as any,
  );

  const keyMetadata = {
    key: {
      extra: { imported: false, mnemonicPhrase },
      type: KeyType.plaintextKey,
      publicKey,
      privateKey,
    },
    password,
    encrypterName: ScryptEncrypter.name,
  };

  let keyStore = { id: "" };

  try {
    keyStore = await keyManager.storeKey(keyMetadata);
  } catch (e) {
    console.error(e);
  }

  const keyIdListArr = await getKeyIdList();
  keyIdListArr[indexToReplace] = keyStore.id;

  await localStore.setItem(KEY_ID_LIST, keyIdListArr);
  await localStore.setItem(KEY_ID, keyStore.id);
  await addAccountName({
    keyId: keyStore.id,
    accountName,
  });
};
