import { captureException } from "@sentry/browser";

import {
  getAccountNameList,
  getKeyIdList,
  HW_PREFIX,
} from "background/helpers/account";
import {
  getPhraseSourceId,
  getSecretKeySourceId,
} from "background/helpers/secret-sources";
import { WalletType } from "@shared/constants/hardwareWallet";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { Account } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const getStoredAccounts = async (
  password: string,
  keyManager: KeyManager,
  localStore: DataStorageAccess,
) => {
  const keyIdList = await getKeyIdList({ localStore });
  const accountNameList = await getAccountNameList({ localStore });
  const unlockedAccounts = [] as Account[];

  // INTERIM, until #75 persists each account's source beside its name: the
  // source is read off the keystore. A secret-key import is its own source;
  // anything else is rooted in the phrase stamped into it. One PBKDF2 per
  // distinct phrase, memoised for this call only so no plaintext phrase
  // outlives the unlock.
  const phraseSourceIds = new Map<string, string>();
  const resolveSourceId = async (keyStore: {
    privateKey: string;
    extra?: { imported?: boolean; mnemonicPhrase?: string };
  }): Promise<string | undefined> => {
    try {
      if (keyStore.extra?.imported) {
        return await getSecretKeySourceId(keyStore.privateKey);
      }
      const phrase = keyStore.extra?.mnemonicPhrase;
      if (!phrase) {
        return undefined;
      }
      if (!phraseSourceIds.has(phrase)) {
        phraseSourceIds.set(phrase, await getPhraseSourceId(phrase));
      }
      return phraseSourceIds.get(phrase);
    } catch (e) {
      // The account is still listed and can still sign; only its grouping
      // is unknown.
      captureException(
        `Error deriving an account source id on unlock: ${JSON.stringify(e)}`,
      );
      return undefined;
    }
  };

  // for loop to preserve order of accounts

  for (let i = 0; i < keyIdList.length; i++) {
    const keyId = keyIdList[i];
    let keyStore;

    // iterate over each keyId we have and get the associated keystore
    let publicKey = "";
    let imported = false;
    let hardwareWalletType = WalletType.NONE;
    let sourceId: string | undefined;

    if (keyId.indexOf(HW_PREFIX) !== -1) {
      publicKey = keyId.split(":")[1];
      imported = true;
      // all hardware wallets are ledgers for now
      hardwareWalletType = WalletType.LEDGER;
    } else {
      try {
        keyStore = await keyManager.loadKey(keyId, password);
      } catch (e) {
        console.error(e);
      }

      publicKey = keyStore?.publicKey || "";
      imported = keyStore?.extra.imported || false;
      sourceId = keyStore ? await resolveSourceId(keyStore) : undefined;
    }

    if (publicKey) {
      // push the data into a list of accounts
      unlockedAccounts.push({
        id: keyId,
        sourceId,
        publicKey,
        name: accountNameList[keyId] || `Account ${keyIdList.length}`,
        imported,
        hardwareWalletType,
      });
    }
  }
  return unlockedAccounts;
};
