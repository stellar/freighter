import { Store } from "redux";
// @ts-ignore
import { fromMnemonic } from "stellar-hd-wallet";

import { allAccountsSelector } from "background/ducks/session";
import { getKeyIdList } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { TEMPORARY_STORE_EXTRA_ID } from "constants/localStorageTypes";
import { MigratableAccount } from "@shared/api/types";

export const getMigratableAccounts = async ({
  localStore,
  sessionStore,
  numOfPublicKeysToCheck,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
  numOfPublicKeysToCheck: number;
}) => {
  const keyIdList = (await getKeyIdList({ localStore })) as string[];

  const mnemonicPhrase = await getEncryptedTemporaryData({
    sessionStore,
    localStore,
    keyName: TEMPORARY_STORE_EXTRA_ID,
  });
  const allAccounts = allAccountsSelector(sessionStore.getState());
  const wallet = fromMnemonic(mnemonicPhrase);

  const mnemonicPublicKeyArr: string[] = [];

  // a bit of brute force; we'll check the number of keyIds the user has plus the number of keyIds we auto-import.
  const numberOfKeyIdsToCheck = keyIdList.length + numOfPublicKeysToCheck;

  for (let i = 0; i < numberOfKeyIdsToCheck; i += 1) {
    mnemonicPublicKeyArr.push(wallet.getPublicKey(i));
  }

  // only use accounts that were derived from the mnemonic phrase
  const migratableAccounts: MigratableAccount[] = [];

  allAccounts.forEach((acct, i) => {
    if (mnemonicPublicKeyArr.includes(acct.publicKey)) {
      migratableAccounts.push({ ...acct, keyIdIndex: i });
    }
  });

  return {
    migratableAccounts,
  };
};
