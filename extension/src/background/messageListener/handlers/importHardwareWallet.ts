import { Store } from "redux";

import { ImportHardWareWalletMessage } from "@shared/api/types/message-request";
import { storeHardwareWalletAccount } from "../helpers/store-hardware-wallet";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";
import { ACCOUNT_ALREADY_EXISTS_ERROR } from "@shared/constants/errors";
import {
  getBipPath,
  getActiveAccountId,
  HW_PREFIX,
} from "background/helpers/account";
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

  // Reconnecting the same device is fine: it resolves to the same `hw:` id.
  // A hot account with this address is not: the default Ledger path is the
  // same path Freighter derives account 0 on, so a Ledger on the wallet's
  // own seed lands here, and the two accounts would share an address.
  const hwId = `${HW_PREFIX}${publicKey}`;
  const isDuplicate = allAccountsSelector(sessionStore.getState()).some(
    (account) => account.publicKey === publicKey && account.id !== hwId,
  );
  if (isDuplicate) {
    return { error: ACCOUNT_ALREADY_EXISTS_ERROR };
  }

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
    activeAccountId: await getActiveAccountId({ localStore }),
    allAccounts: allAccountsSelector(sessionStore.getState()),
    hasPrivateKey: await hasPrivateKeySelector(sessionStore.getState()),
    bipPath: await getBipPath({ localStore }),
  };
};
