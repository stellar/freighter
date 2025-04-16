import { Store } from "redux";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

import {
  getIsHardwareWalletActive,
  getKeyIdList,
  HW_PREFIX,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  KEY_ID,
  TEMPORARY_STORE_EXTRA_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";
import { getNonHwKeyID } from "./get-non-hw-key-id";
import { unlockKeystore } from "./unlock-keystore";
import {
  clearSession,
  deriveKeyFromString,
  SessionTimer,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
} from "background/helpers/session";
import {
  allAccountsSelector,
  logIn,
  publicKeySelector,
} from "background/ducks/session";
import { getStoredAccounts } from "./get-stored-accounts";
import { captureException } from "@sentry/browser";

/* Retrive and store encrypted data for all existing accounts */
export const loginToAllAccounts = async (
  password: string,
  localStore: DataStorageAccess,
  sessionStore: Store,
  keyManager: KeyManager,
  sessionTimer: SessionTimer,
) => {
  const keyIdList = await getKeyIdList({ localStore });

  // if active hw then use the first non-hw keyID to check password
  // with keyManager
  let keyID = (await localStore.getItem(KEY_ID)) || "";
  let hwPublicKey = "";
  if (await getIsHardwareWalletActive({ localStore })) {
    hwPublicKey = keyID.split(":")[1];
    keyID = await getNonHwKeyID({ localStore });
  }

  // first make sure the password is correct to get active keystore, short circuit if not
  const activeAccountKeystore = await unlockKeystore({
    keyID,
    password,
    keyManager,
  });

  const {
    publicKey: activePublicKey,
    extra: activeExtra = { mnemonicPhrase: "" },
  } = activeAccountKeystore;

  const activeMnemonicPhrase = activeExtra.mnemonicPhrase;
  const hashKey = await deriveKeyFromString(password);

  if (
    !publicKeySelector(sessionStore.getState()) ||
    !allAccountsSelector(sessionStore.getState()).length
  ) {
    // we have cleared redux store via reloading extension/browser
    // construct allAccounts from local storage
    // log the user in using all accounts and public key/phrase from above to create the store

    await sessionStore.dispatch(
      logIn({
        publicKey: hwPublicKey || activePublicKey,
        allAccounts: await getStoredAccounts(password, keyManager, localStore),
        localStore,
      }) as any,
    );
  }

  // clear the temporary store (if it exists) so we can replace it with the new encrypted data
  await localStore.remove(TEMPORARY_STORE_ID);

  try {
    await storeEncryptedTemporaryData({
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
      temporaryData: activeMnemonicPhrase,
      hashKey,
    });
  } catch (e) {
    await clearSession({ localStore, sessionStore });
    captureException(
      `Error storing encrypted temporary data: ${JSON.stringify(e)}`,
    );
  }

  for (let i = 0; i < keyIdList.length; i += 1) {
    const currentKeyId = keyIdList[i];

    if (!currentKeyId.includes(HW_PREFIX)) {
      const keyStoreToUnlock = await unlockKeystore({
        keyID: keyIdList[i],
        password,
        keyManager,
      });

      try {
        await storeEncryptedTemporaryData({
          localStore,
          keyName: keyIdList[i],
          temporaryData: keyStoreToUnlock.privateKey,
          hashKey,
        });
      } catch (e) {
        captureException(
          `Error storing encrypted temporary data: ${JSON.stringify(
            e,
          )} - ${JSON.stringify(keyIdList)}: ${i}`,
        );
      }
    }
  }

  try {
    await storeActiveHashKey({
      sessionStore,
      hashKey,
    });
  } catch (e) {
    await clearSession({ localStore, sessionStore });
    captureException(`Error storing active hash key: ${JSON.stringify(e)}`);
  }

  // start the timer now that we have active private key
  sessionTimer.startSession();
};
