import { Store } from "redux";

import { ImportHardWareWalletMessage } from "@shared/api/types/message-request";
import { storeHardwareWalletAccount } from "../helpers/store-hardware-wallet";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";
import { getBipPath } from "background/helpers/account";

export const importHardwareWallet = async ({
  request,
  sessionStore,
  localStore,
}: {
  request: ImportHardWareWalletMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  const { publicKey, hardwareWalletType, bipPath } = request;

  await storeHardwareWalletAccount({
    publicKey,
    hardwareWalletType,
    bipPath,
    sessionStore,
    localStore,
  });
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    allAccounts: allAccountsSelector(sessionStore.getState()),
    hasPrivateKey: await hasPrivateKeySelector(sessionStore.getState()),
    bipPath: await getBipPath(),
  };
};
