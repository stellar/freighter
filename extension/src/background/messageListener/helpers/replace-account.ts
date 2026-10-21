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
  1. We save the key store in storage
  2. We swap the old account for the new one, in place, in Redux and in `keyIdList`, and set the new active public key
  3. We save the new account name in storage
*/
export const replaceAccount = async ({
  args: { mnemonicPhrase, sourceId, password, keyPair, idToReplace },
  localStore,
  sessionStore,
  keyManager,
}: {
  args: {
    mnemonicPhrase: string;
    /** The migrated phrase's source id; the new account is rooted in it. */
    sourceId: string;
    password: string;
    keyPair: KeyPair;
    /** The keystore id of the account being replaced. */
    idToReplace: string;
  };
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
}) => {
  const { publicKey, privateKey } = keyPair;

  const allAccounts = allAccountsSelector(sessionStore.getState());
  const accountIndex = allAccounts.findIndex(({ id }) => id === idToReplace);
  if (accountIndex === -1) {
    throw new Error(`No account with id ${idToReplace}`);
  }
  // Only a check: the list is read again after `storeKey` below.
  const keyIdIndex = (await getKeyIdList({ localStore })).indexOf(idToReplace);
  if (keyIdIndex === -1) {
    throw new Error(`No keystore with id ${idToReplace}`);
  }

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

  // Let a failed store throw: an account whose keystore does not exist must
  // never enter the session or the list.
  const keyStore = await keyManager.storeKey(keyMetadata);

  const accountName = `Account ${keyIdIndex + 1}`;
  const newAllAccounts = [...allAccounts];
  newAllAccounts[accountIndex] = {
    id: keyStore.id,
    sourceId,
    publicKey,
    name: accountName,
    imported: false,
  };

  await sessionStore.dispatch(
    logIn({
      publicKey,
      allAccounts: newAllAccounts,
      localStore,
    }) as any,
  );

  // Re-read the list now that Scrypt is done: another surface may have added
  // a keystore id meanwhile, and a snapshot from before `storeKey` would drop
  // it. (#112 serializes these handlers; until then keep the window small.)
  const keyIdListArr: string[] = await getKeyIdList({ localStore });
  const slot = keyIdListArr.indexOf(idToReplace);
  if (slot === -1) {
    throw new Error(`No keystore with id ${idToReplace}`);
  }
  keyIdListArr[slot] = keyStore.id;

  await localStore.setItem(KEY_ID_LIST, keyIdListArr);
  await localStore.setItem(KEY_ID, keyStore.id);
  await addAccountName({
    keyId: keyStore.id,
    accountName,
    localStore,
  });
};
