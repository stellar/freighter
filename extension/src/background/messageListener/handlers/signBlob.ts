import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import { captureException } from "@sentry/browser";
import { getNetworkDetails } from "background/helpers/account";
import { getSdk } from "@shared/helpers/stellar";
import {
  BlobQueue,
  ResponseQueue,
  SignBlobResponse,
} from "@shared/api/types/message-request";
import { SIGN_MESSAGE_PREFIX } from "helpers/stellar";
import { hash } from "stellar-sdk";

export const signBlob = async ({
  localStore,
  sessionStore,
  blobQueue,
  responseQueue,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
  blobQueue: BlobQueue;
  responseQueue: ResponseQueue<SignBlobResponse>;
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
    captureException(`Sign blob: No private key found: ${JSON.stringify(e)}`);
  }

  const networkDetails = await getNetworkDetails({ localStore });

  const Sdk = getSdk(networkDetails.networkPassphrase);

  if (privateKey.length) {
    const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
    const blob = blobQueue.pop();

    let response = null;

    if (blob) {
      const messageBytes = Buffer.from(blob.message, "utf8");
      const prefixBytes = Buffer.from(SIGN_MESSAGE_PREFIX, "utf8");
      const encodedMessage = Buffer.concat([prefixBytes, messageBytes]);
      const messageHash = hash(encodedMessage);
      response = sourceKeys.sign(messageHash);
    }

    const blobResponse = responseQueue.pop();

    if (typeof blobResponse === "function") {
      blobResponse(response, sourceKeys.publicKey());
      return {};
    }
  }

  return { error: "Session timed out" };
};
