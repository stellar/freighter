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
import { markDerivationIndexUsed } from "background/helpers/derivation-indices";
import { setAccountProvenance } from "background/helpers/account-provenance";
import { AccountType } from "@shared/api/types";
import {
  getNextDefaultAccountName,
  normalizeAccountName,
} from "@shared/helpers/accountName";

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/* Append an additional account to user's account list */
export const storeAccount = async ({
  mnemonicPhrase,
  phraseSourceId,
  sourceId,
  derivationIndex,
  accountName: requestedAccountName,
  password,
  keyPair,
  imported = false,
  isSettingHashKey = false,
  sessionStore,
  keyManager,
  localStore,
}: {
  /**
   * The phrase that derived `keyPair`. Required for a derived account and
   * stamped into its keystore, which is where unlock still collects the held
   * phrases from. A secret-key import has none.
   */
  mnemonicPhrase?: string;
  /**
   * The source id of `mnemonicPhrase`. When given, the phrase is held in the
   * session's mnemonic map under it.
   */
  phraseSourceId?: string;
  /**
   * The `SecretSource` the account is rooted in: the phrase it was derived
   * from, or its own secret key for a standalone import. Required and never
   * inferred from `phraseSourceId`.
   */
  sourceId: string;
  /**
   * The index on `phraseSourceId` that derived `keyPair`. Marked used the
   * moment the keystore exists. Secret-key imports have none.
   */
  derivationIndex?: number;
  /** The name the user chose. Absent or blank, the next default name. */
  accountName?: string;
  password: string;
  keyPair: KeyPair;
  imported?: boolean;
  isSettingHashKey?: boolean;
  sessionStore: Store;
  keyManager: KeyManager;
  localStore: DataStorageAccess;
}) => {
  const { publicKey, privateKey } = keyPair;

  if (derivationIndex !== undefined && !phraseSourceId) {
    throw new Error("A derivation index belongs to a phrase source");
  }
  if (!imported && !mnemonicPhrase) {
    throw new Error("A derived account must carry its phrase");
  }
  if (imported && mnemonicPhrase) {
    throw new Error("A secret-key import carries no phrase");
  }

  const allAccounts = allAccountsSelector(sessionStore.getState());
  const accountName =
    normalizeAccountName(requestedAccountName) ||
    getNextDefaultAccountName(allAccounts.map(({ name }) => name));

  let activeHashKey = await getActiveHashKeyCryptoKey({ sessionStore });
  if (activeHashKey === null && isSettingHashKey) {
    // this should only happen on account creation & account recovery
    activeHashKey = await deriveKeyFromString(password);
  }

  if (activeHashKey === null) {
    throw new Error("Error deriving hash key");
  }

  // A derived keystore keeps its phrase so the existing unlock readers keep
  // working; an import's keystore says only that it is one.
  const extra = mnemonicPhrase ? { imported, mnemonicPhrase } : { imported };

  const keyMetadata = {
    key: {
      extra,
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

  // Mark the index before anything else makes the account real. A mark that
  // failed after the `keyIdList` write would leave a stored account whose
  // index the next add re-derives; a mark that succeeded before a later
  // failure leaves at worst a gap.
  if (derivationIndex !== undefined && phraseSourceId) {
    await markDerivationIndexUsed({
      localStore,
      sourceId: phraseSourceId,
      index: derivationIndex,
    });
  }

  // Provenance is written before the account is listed, for the same reason:
  // the list may never name an account the map cannot attribute.
  await setAccountProvenance({
    localStore,
    keyId: keyStore.id,
    type: imported ? AccountType.IMPORTED : AccountType.FREIGHTER,
    sourceId,
  });

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
