import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

import { RevealSecretKeyMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getKeyIdList, HW_PREFIX } from "background/helpers/account";
import { unlockKeystore } from "../helpers/unlock-keystore";

/*
  Returns one account's private key. `accountId` is the account's keystore id,
  so the password is checked against that account's own keystore, even when
  the wallet is unlocked, and the key comes from the same decrypt.
*/
export const revealSecretKey = async ({
  request,
  localStore,
  keyManager,
}: {
  request: RevealSecretKeyMessage;
  localStore: DataStorageAccess;
  keyManager: KeyManager;
}): Promise<{ secretKey: string } | { error: string }> => {
  const { password, accountId } = request;

  if (accountId.startsWith(HW_PREFIX)) {
    return { error: "No secret key is held for a hardware account" };
  }

  // Only a keystore the wallet lists is ever opened.
  const keyIdList = await getKeyIdList({ localStore });
  if (!keyIdList.includes(accountId)) {
    return { error: "Account not found" };
  }

  let key;
  try {
    key = await unlockKeystore({ keyID: accountId, password, keyManager });
  } catch (e) {
    return { error: "Incorrect password" };
  }

  if (!key?.privateKey) {
    return { error: "Account not found" };
  }

  return { secretKey: key.privateKey };
};
