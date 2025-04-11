import { Store } from "redux";
import { captureException } from "@sentry/browser";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import { getNetworkDetails } from "background/helpers/account";
import { getSdk } from "@shared/helpers/stellar";
import { EntryQueue, ResponseQueue } from "@shared/api/types/message-request";

export const signAuthEntry = async ({
  localStore,
  sessionStore,
  authEntryQueue,
  responseQueue,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
  authEntryQueue: EntryQueue;
  responseQueue: ResponseQueue;
}) => {
  const keyId = (await localStore.getItem(KEY_ID)) || "";
  let privateKey = "";

  try {
    privateKey = await getEncryptedTemporaryData({
      localStore,
      sessionStore,
      keyName: keyId,
    });
  } catch (e) {
    captureException(
      `Sign auth entry: No private key found: ${JSON.stringify(e)}`,
    );
  }

  const networkDetails = await getNetworkDetails();

  const Sdk = getSdk(networkDetails.networkPassphrase);

  if (privateKey.length) {
    const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
    const authEntry = authEntryQueue.pop();

    const response = authEntry
      ? sourceKeys.sign(Sdk.hash(Buffer.from(authEntry.entry, "base64")))
      : null;

    const entryResponse = responseQueue.pop();

    if (typeof entryResponse === "function") {
      entryResponse(response, sourceKeys.publicKey());
      return {};
    }
  }

  return { error: "Session timed out" };
};
