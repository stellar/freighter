import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";

import { allAccountsSelector } from "background/ducks/session";
import { getKeyIdList } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getDefaultMnemonic } from "background/helpers/secret-sources";
import { getDerivationIndices } from "background/helpers/derivation-indices";
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

  const source = await getDefaultMnemonic({ sessionStore, localStore });
  const mnemonicPhrase = source?.mnemonic ?? "";
  const allAccounts = allAccountsSelector(sessionStore.getState());
  const wallet = fromMnemonic(mnemonicPhrase);

  const mnemonicPublicKeyArr: string[] = [];

  // A bit of brute force: scan past the phrase's highest used index (its set
  // can have holes, so the keystore count alone can fall short of it) plus
  // the number of keys a recovery auto-imports.
  const usedIndices = source
    ? await getDerivationIndices({ localStore, sourceId: source.sourceId })
    : [];
  const highestUsedIndex = usedIndices.length ? Math.max(...usedIndices) : -1;
  const numberOfKeyIdsToCheck =
    Math.max(keyIdList.length, highestUsedIndex + 1) + numOfPublicKeysToCheck;

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
