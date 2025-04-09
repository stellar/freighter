import {
  getAccountNameList,
  getKeyIdList,
  HW_PREFIX,
} from "background/helpers/account";
import { WalletType } from "@shared/constants/hardwareWallet";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { Account } from "@shared/api/types";

export const getStoredAccounts = async (
  password: string,
  keyManager: KeyManager,
) => {
  const keyIdList = await getKeyIdList();
  const accountNameList = await getAccountNameList();
  const unlockedAccounts = [] as Account[];

  // for loop to preserve order of accounts

  for (let i = 0; i < keyIdList.length; i++) {
    const keyId = keyIdList[i];
    let keyStore;

    // iterate over each keyId we have and get the associated keystore
    let publicKey = "";
    let imported = false;
    let hardwareWalletType = WalletType.NONE;

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
    }

    if (publicKey) {
      // push the data into a list of accounts
      unlockedAccounts.push({
        publicKey,
        name: accountNameList[keyId] || `Account ${keyIdList.length}`,
        imported,
        hardwareWalletType,
      });
    }
  }
  return unlockedAccounts;
};
