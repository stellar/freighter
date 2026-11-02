import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";

import { ImportAccountMessage } from "@shared/api/types/message-request";
import { ACCOUNT_ALREADY_EXISTS_ERROR } from "@shared/constants/errors";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getEncryptedTemporaryData,
  SessionTimer,
} from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import {
  addSecretSource,
  getDefaultMnemonic,
  getSecretKeySourceId,
} from "background/helpers/secret-sources";
import { SecretSourceType } from "@shared/api/types";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { getNonHwKeyID } from "../helpers/get-non-hw-key-id";
import { unlockKeystore } from "../helpers/unlock-keystore";
import {
  getIsHardwareWalletActive,
  getActiveAccountId,
} from "background/helpers/account";
import { storeAccount } from "../helpers/store-account";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";

export const importAccount = async ({
  request,
  sessionStore,
  localStore,
  keyManager,
  sessionTimer,
}: {
  request: ImportAccountMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { password, privateKey } = request;
  let sourceKeys;

  // The held phrase is still stamped into the import's keystore `extra`
  // for now; it is not what identifies the import. The import is
  // its own source, registered below from its own key.
  let source = await getDefaultMnemonic({ sessionStore, localStore });

  if (!source) {
    try {
      await loginToAllAccounts(
        password,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      );
      source = await getDefaultMnemonic({ sessionStore, localStore });
    } catch (e) {
      captureException(
        `Error logging in to all accounts in Import Account - ${JSON.stringify(
          e,
        )}`,
      );
      return { error: "Unable to login" };
    }
  }

  const keyID = (await getIsHardwareWalletActive({ localStore }))
    ? await getNonHwKeyID({ localStore })
    : (await localStore.getItem(KEY_ID)) || "";
  // if the session is active, confirm that the password is correct and the hashkey properly unlocks
  let activePrivateKey = "";

  try {
    await unlockKeystore({ keyID, password, keyManager });
    activePrivateKey = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: keyID,
    });
    sourceKeys = Keypair.fromSecret(privateKey);
  } catch (e) {
    console.error(e);
    return { error: "Please enter a valid secret key/password combination" };
  }

  const keyPair = {
    publicKey: sourceKeys.publicKey(),
    privateKey,
  };

  // An address the wallet already holds, hot or hardware, would give two
  // accounts one address. Flows that only know the address can't tell them
  // apart, so refuse before anything is stored.
  const isDuplicate = allAccountsSelector(sessionStore.getState()).some(
    (account) => account.publicKey === keyPair.publicKey,
  );
  if (isDuplicate) {
    return { error: ACCOUNT_ALREADY_EXISTS_ERROR };
  }

  try {
    const sourceId = await getSecretKeySourceId(privateKey);
    await storeAccount({
      password,
      keyPair,
      mnemonicPhrase: source?.mnemonic ?? "",
      sourceId,
      imported: true,
      sessionStore,
      localStore,
      keyManager,
    });
    await addSecretSource({
      localStore,
      id: sourceId,
      type: SecretSourceType.SECRET_KEY,
    });
  } catch (e) {
    captureException(`Error importing account: ${JSON.stringify(e)}`);
    return { error: "Error importing account" };
  }

  if (!activePrivateKey) {
    captureException("Error decrypting active private key in Import Account");
    return { error: "Error importing account" };
  }

  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    publicKey: publicKeySelector(currentState),
    activeAccountId: await getActiveAccountId({ localStore }),
    allAccounts: allAccountsSelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
  };
};
