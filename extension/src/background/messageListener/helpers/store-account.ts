import { Store } from "redux";
import {
  ScryptEncrypter,
  KeyType,
  KeyManager,
} from "@stellar/typescript-wallet-sdk-km";

import { allAccountsSelector, logIn } from "background/ducks/session";
import {
  deriveKeyFromString,
  getActiveHashKeyCryptoKey,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
} from "background/helpers/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  KEY_ID,
  KEY_ID_LIST,
  TEMPORARY_STORE_EXTRA_ID,
} from "constants/localStorageTypes";
import { addAccountName, getKeyIdList } from "background/helpers/account";

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/* Append an additional account to user's account list */
export const storeAccount = async ({
  mnemonicPhrase,
  password,
  keyPair,
  imported = false,
  isSettingHashKey = false,
  sessionStore,
  keyManager,
  localStore,
}: {
  mnemonicPhrase: string;
  password: string;
  keyPair: KeyPair;
  imported?: boolean;
  isSettingHashKey?: boolean;
  sessionStore: Store;
  keyManager: KeyManager;
  localStore: DataStorageAccess;
}) => {
  const { publicKey, privateKey } = keyPair;

  const allAccounts = allAccountsSelector(sessionStore.getState());
  const accountName = `Account ${allAccounts.length + 1}`;

  let activeHashKey = await getActiveHashKeyCryptoKey({ sessionStore });
  if (activeHashKey === null && isSettingHashKey) {
    // this should only happen on account creation & account recovery
    activeHashKey = await deriveKeyFromString(password);
  }

  if (activeHashKey === null) {
    throw new Error("Error deriving hash key");
  }

  // set the active public key
  await sessionStore.dispatch(
    logIn({
      publicKey,
      allAccounts: [
        ...allAccounts,
        {
          publicKey,
          name: accountName,
          imported,
        },
      ],
    }) as any,
  );

  const keyMetadata = {
    key: {
      extra: { imported, mnemonicPhrase },
      type: KeyType.plaintextKey,
      publicKey,
      privateKey,
    },

    password,
    encrypterName: ScryptEncrypter.name,
  };

  let keyStore = { id: "" };

  // store encrypted extra data

  keyStore = await keyManager.storeKey(keyMetadata);
  await storeEncryptedTemporaryData({
    localStore,
    keyName: TEMPORARY_STORE_EXTRA_ID,
    temporaryData: mnemonicPhrase,
    hashKey: activeHashKey,
  });

  // store encrypted keypair data
  await storeEncryptedTemporaryData({
    localStore,
    keyName: keyStore.id,
    temporaryData: keyPair.privateKey,
    hashKey: activeHashKey,
  });

  await storeActiveHashKey({
    sessionStore,
    hashKey: activeHashKey,
  });

  const keyIdListArr = await getKeyIdList();
  keyIdListArr.push(keyStore.id);

  await localStore.setItem(KEY_ID_LIST, keyIdListArr);
  await localStore.setItem(KEY_ID, keyStore.id);
  await addAccountName({
    keyId: keyStore.id,
    accountName,
  });
};
