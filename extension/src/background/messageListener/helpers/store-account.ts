import { Store } from "redux";
import {
  ScryptEncrypter,
  KeyType,
  KeyManager,
} from "@stellar/typescript-wallet-sdk-km";

import { allAccountsSelector, logIn } from "background/ducks/session";
import {
  addMnemonic,
  deriveKeyFromString,
  getActiveHashKeyCryptoKey,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
} from "background/helpers/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID, KEY_ID_LIST } from "constants/localStorageTypes";
import { addAccountName, getKeyIdList } from "background/helpers/account";

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/* Append an additional account to user's account list */
export const storeAccount = async ({
  mnemonicPhrase,
  phraseSourceId,
  sourceId,
  password,
  keyPair,
  imported = false,
  isSettingHashKey = false,
  sessionStore,
  keyManager,
  localStore,
}: {
  mnemonicPhrase: string;
  /**
   * The source id of `mnemonicPhrase`. When given, the phrase is held in the
   * session's mnemonic map under it. Callers that only stamp a phrase into the
   * keystore (secret-key imports, for now) leave it out.
   */
  phraseSourceId?: string;
  /**
   * The `SecretSource` the account is rooted in: the phrase it was derived
   * from, or its own secret key for a standalone import. Required and never
   * inferred from `phraseSourceId`, so an import cannot inherit the phrase
   * that is still stamped into its keystore (#75).
   */
  sourceId: string;
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

  // The keystore id is the account's id, so the account joins the session
  // only once the keystore exists. A failed store leaves no account behind.
  await sessionStore.dispatch(
    logIn({
      publicKey,
      allAccounts: [
        ...allAccounts,
        {
          id: keyStore.id,
          sourceId,
          publicKey,
          name: accountName,
          imported,
        },
      ],
      localStore,
    }) as any,
  );

  if (mnemonicPhrase && phraseSourceId) {
    await addMnemonic({
      localStore,
      hashKey: activeHashKey,
      sourceId: phraseSourceId,
      mnemonic: mnemonicPhrase,
    });
  }

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

  const keyIdListArr = await getKeyIdList({ localStore });
  keyIdListArr.push(keyStore.id);

  await localStore.setItem(KEY_ID_LIST, keyIdListArr);
  await localStore.setItem(KEY_ID, keyStore.id);
  await addAccountName({
    keyId: keyStore.id,
    accountName,
    localStore,
  });
};
