import { Store } from "redux";

import { WalletType } from "@shared/constants/hardwareWallet";
import { allAccountsSelector, logIn } from "background/ducks/session";
import {
  addAccountName,
  getKeyIdList,
  HW_PREFIX,
} from "background/helpers/account";
import { KEY_ID, KEY_ID_LIST } from "constants/localStorageTypes";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { setAccountProvenance } from "background/helpers/account-provenance";
import { AccountType } from "@shared/api/types";

// in lieu of using KeyManager, let's store hW data in local storage
// using schema:
// "hw:<G account>": {
//   publicKey: "",
//   bipPath: "",

// }
export const storeHardwareWalletAccount = async ({
  publicKey,
  hardwareWalletType,
  bipPath,
  sessionStore,
  localStore,
}: {
  publicKey: string;
  hardwareWalletType: WalletType;
  bipPath: string;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  let allAccounts = allAccountsSelector(sessionStore.getState());

  const keyId = `${HW_PREFIX}${publicKey}`;
  const keyIdListArr = await getKeyIdList({ localStore });
  const accountName = `${hardwareWalletType} ${
    allAccounts.filter(
      ({ hardwareWalletType: hwType }) => hwType !== hardwareWalletType,
    ).length + 1
  }`;

  if (keyIdListArr.indexOf(keyId) === -1) {
    // Before the list names it, as `storeAccount` does. No source: a
    // hardware account holds no secret.
    await setAccountProvenance({
      localStore,
      keyId,
      type: AccountType.HW,
    });
    keyIdListArr.push(keyId);
    await localStore.setItem(KEY_ID_LIST, keyIdListArr);
    const hwData = {
      bipPath,
      publicKey,
    };
    await localStore.setItem(keyId, hwData);
    await addAccountName({
      keyId,
      accountName,
      localStore,
    });
    allAccounts = [
      ...allAccounts,
      {
        // A hardware account has no secret and so no source.
        id: keyId,
        publicKey,
        name: accountName,
        imported: true,
        hardwareWalletType,
      },
    ];
  }

  await localStore.setItem(KEY_ID, keyId);

  await sessionStore.dispatch(
    logIn({
      publicKey,
      allAccounts,
      localStore,
    }) as any,
  );
};
