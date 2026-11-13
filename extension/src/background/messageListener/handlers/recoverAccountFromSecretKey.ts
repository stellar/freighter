import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";

import { RecoverAccountFromSecretKeyMessage } from "@shared/api/types/message-request";
import { SecretSourceType } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { SessionTimer } from "background/helpers/session";
import {
  addSecretSource,
  getSecretKeySourceId,
} from "background/helpers/secret-sources";
import { APPLICATION_ID, KEY_ID } from "constants/localStorageTypes";
import { removePreviousAccount } from "../helpers/remove-previous-account";
import { storeAccount } from "../helpers/store-account";
import {
  buildRecoveryResponse,
  clearWalletForRecovery,
  finishRecovery,
} from "../helpers/recovery-lifecycle";

/*
  Onboards a wallet from a single secret key: one imported account rooted in
  its own SECRET_KEY source, with no phrase. Unlike the phrase handler it
  validates before anything is removed, and a failed store leaves a clean
  fresh install rather than a half-written wallet.
*/
export const recoverAccountFromSecretKey = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: RecoverAccountFromSecretKeyMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { password, secretKey, isOverwritingAccount } = request;
  let keyPair;
  let sourceId;

  // Nothing is logged here: the error would carry the key.
  try {
    keyPair = {
      publicKey: Keypair.fromSecret(secretKey).publicKey(),
      privateKey: secretKey,
    };
    sourceId = await getSecretKeySourceId(secretKey);
  } catch {
    return buildRecoveryResponse({
      localStore,
      sessionStore,
      error: "Invalid secret key",
    });
  }

  if (isOverwritingAccount) {
    await removePreviousAccount({ localStore });
  }

  await clearWalletForRecovery({ localStore, sessionStore });

  try {
    await storeAccount({
      password,
      keyPair,
      sourceId,
      imported: true,
      isSettingHashKey: true,
      sessionStore,
      localStore,
      keyManager,
    });
    await addSecretSource({
      localStore,
      id: sourceId,
      type: SecretSourceType.SECRET_KEY,
    });
  } catch {
    // No payload: a thrown error may carry the key.
    captureException("Error recovering account from secret key");
    // The previous wallet is already gone, so undo the partial writes and
    // leave a fresh install the user can retry from.
    await clearWalletForRecovery({ localStore, sessionStore });
    await localStore.remove(APPLICATION_ID);
    await localStore.remove(KEY_ID);
    return buildRecoveryResponse({
      localStore,
      sessionStore,
      error: "Error importing account",
    });
  }

  await finishRecovery({
    publicKey: keyPair.publicKey,
    localStore,
    sessionStore,
    sessionTimer,
  });

  return buildRecoveryResponse({ localStore, sessionStore, error: "" });
};
