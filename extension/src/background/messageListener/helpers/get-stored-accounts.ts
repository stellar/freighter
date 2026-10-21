import {
  getAccountNameList,
  getKeyIdList,
  HW_PREFIX,
} from "background/helpers/account";
import { getAccountProvenance } from "background/helpers/account-provenance";
import { WalletType } from "@shared/constants/hardwareWallet";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { Account, AccountType } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const getStoredAccounts = async (
  password: string,
  keyManager: KeyManager,
  localStore: DataStorageAccess,
) => {
  const keyIdList = await getKeyIdList({ localStore });
  const accountNameList = await getAccountNameList({ localStore });
  // Every account's type and source, from plain storage. The keystore's
  // `extra` is never consulted: an id with no entry is a pre-V2 account the
  // #76 migration has not attributed yet, and it is listed without a source.
  const provenance = await getAccountProvenance({ localStore });
  const unlockedAccounts = [] as Account[];

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
      // The prefix is the hardware keystore's id format, and there is no
      // keystore to open.
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
      const entry = provenance[keyId];
      imported = !!entry && entry.type !== AccountType.FREIGHTER;
      sourceId = entry?.sourceId;
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
