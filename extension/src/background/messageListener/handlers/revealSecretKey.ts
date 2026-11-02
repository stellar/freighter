import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

import { RevealSecretKeyMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getKeyIdList, HW_PREFIX } from "background/helpers/account";
import {
  getEncryptedTemporaryData,
  SessionTimer,
} from "background/helpers/session";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { unlockKeystore } from "../helpers/unlock-keystore";

/*
  Finds the keystore that holds `publicKey` by reading the session's
  decrypted private keys, so the lookup costs no Scrypt. Returns "" when the
  session holds no matching key (locked, or an account the wallet doesn't
  hold).
*/
const findKeyId = async ({
  publicKey,
  localStore,
  sessionStore,
}: {
  publicKey: string;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const keyIdList = await getKeyIdList({ localStore });

  for (const keyId of keyIdList) {
    if (keyId.includes(HW_PREFIX)) {
      continue;
    }

    const privateKey = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: keyId,
    });

    try {
      if (
        privateKey &&
        Keypair.fromSecret(privateKey).publicKey() === publicKey
      ) {
        return keyId;
      }
    } catch {
      // An unreadable entry is not this account; keep looking.
    }
  }

  return "";
};

export const revealSecretKey = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: RevealSecretKeyMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}): Promise<{ secretKey: string } | { error: string }> => {
  const { password, publicKey } = request;

  const keyIdList = await getKeyIdList({ localStore });
  if (keyIdList.includes(`${HW_PREFIX}${publicKey}`)) {
    return { error: "No secret key is held for a hardware account" };
  }

  let keyId = await findKeyId({ publicKey, localStore, sessionStore });

  // Nothing found may only mean the session is locked: unlock, then look
  // again. A wrong password fails here.
  if (!keyId) {
    try {
      await loginToAllAccounts(
        password,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      );
    } catch (e) {
      return { error: "Incorrect password" };
    }
    keyId = await findKeyId({ publicKey, localStore, sessionStore });
  }

  if (!keyId) {
    return { error: "Account not found" };
  }

  // Re-authenticate against the account's own keystore even when the
  // session is unlocked, and return the key that keystore holds.
  let key;
  try {
    key = await unlockKeystore({ keyID: keyId, password, keyManager });
  } catch (e) {
    return { error: "Incorrect password" };
  }

  if (!key?.privateKey || key.publicKey !== publicKey) {
    return { error: "Account not found" };
  }

  return { secretKey: key.privateKey };
};
