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
import { SessionTimer } from "background/helpers/session";

export const importHardwareWallet = async ({
  request,
  sessionStore,
  localStore,
  sessionTimer,
}: {
  request: ImportHardWareWalletMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
  sessionTimer: SessionTimer;
}) => {
  const { publicKey, hardwareWalletType, bipPath } = request;

  await storeHardwareWalletAccount({
    publicKey,
    hardwareWalletType,
    bipPath,
    sessionStore,
    localStore,
  });
  // Importing a hardware wallet flips the session into the "HW-active"
  // state where `buildHasPrivateKeySelector` reports the wallet as
  // unlocked. Arm the idle auto-lock alarm here so HW-only sessions
  // are subject to the same idle-lock guarantees as hot-wallet
  // sessions — otherwise an HW-only import has no auto-lock at all.
  await sessionTimer.startSession();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    allAccounts: allAccountsSelector(sessionStore.getState()),
    hasPrivateKey: await hasPrivateKeySelector(sessionStore.getState()),
    bipPath: await getBipPath({ localStore }),
  };
};
