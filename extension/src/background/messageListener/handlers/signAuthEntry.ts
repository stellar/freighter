import { Store } from "redux";
import { captureException } from "@sentry/browser";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import { getNetworkDetails } from "background/helpers/account";
import { getSdk } from "@shared/helpers/stellar";
import {
  EntryQueue,
  ResponseQueue,
  SignAuthEntryMessage,
  SignAuthEntryResponse,
} from "@shared/api/types/message-request";

export const signAuthEntry = async ({
  request,
  localStore,
  sessionStore,
  authEntryQueue,
  responseQueue,
}: {
  request: SignAuthEntryMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  authEntryQueue: EntryQueue;
  responseQueue: ResponseQueue<SignAuthEntryResponse>;
}) => {
  const { uuid } = request;

  if (!uuid) {
    captureException("signAuthEntry: missing uuid in request");
    return { error: "Transaction not found" };
  }

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

  const networkDetails = await getNetworkDetails({ localStore });

  const Sdk = getSdk(networkDetails.networkPassphrase);

  if (privateKey.length) {
    const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
    const queueIndex = authEntryQueue.findIndex((item) => item.uuid === uuid);
    const authEntryQueueItem =
      queueIndex !== -1 ? authEntryQueue.splice(queueIndex, 1)[0] : undefined;
    const authEntry = authEntryQueueItem?.authEntry;

    const response = authEntry
      ? sourceKeys.sign(Sdk.hash(Buffer.from(authEntry.entry, "base64")))
      : null;

    const responseIndex = responseQueue.findIndex((item) => item.uuid === uuid);
    const entryResponse =
      responseIndex !== -1
        ? responseQueue.splice(responseIndex, 1)[0]
        : undefined;

    if (entryResponse && typeof entryResponse.response === "function") {
      entryResponse.response(response, sourceKeys.publicKey());
      return {};
    }

    captureException(
      `signAuthEntry: no matching response found for uuid ${uuid}`,
    );
  }

  return { error: "Session timed out" };
};
