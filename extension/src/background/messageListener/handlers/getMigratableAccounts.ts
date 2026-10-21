import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";

import { allAccountsSelector } from "background/ducks/session";
import { getKeyIdList } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getDefaultMnemonic } from "background/helpers/secret-sources";
import { MigratableAccount } from "@shared/api/types";

const { fromMnemonic } = StellarHDWallet;

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

  const mnemonicPhrase =
    (await getDefaultMnemonic({ sessionStore, localStore }))?.mnemonic ?? "";
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

  allAccounts.forEach((acct) => {
    if (mnemonicPublicKeyArr.includes(acct.publicKey)) {
      migratableAccounts.push({ ...acct });
    }
  });

  return {
    migratableAccounts,
  };
};
