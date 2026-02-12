import { Store } from "redux";
import semver from "semver";
import { captureException } from "@sentry/browser";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import { getNetworkDetails } from "background/helpers/account";
import { getSdk, isPlaywright } from "@shared/helpers/stellar";
import {
  BlobQueue,
  ResponseQueue,
  SignBlobMessage,
  SignBlobResponse,
} from "@shared/api/types/message-request";
import { encodeSep53Message } from "helpers/stellar";

export const signBlob = async ({
  request,
  localStore,
  sessionStore,
  blobQueue,
  responseQueue,
}: {
  request: SignBlobMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  blobQueue: BlobQueue;
  responseQueue: ResponseQueue<SignBlobResponse>;
}) => {
  const { uuid, apiVersion } = request;
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
    const queueIndex = blobQueue.findIndex((item) => item.uuid === uuid);
    const blobQueueItem =
      queueIndex !== -1 ? blobQueue.splice(queueIndex, 1)[0] : undefined;
    const blob = blobQueueItem?.blob;

    let response = null;

    if (blob) {
      const supportsSep53 =
        (apiVersion && semver.gte(apiVersion, "5.0.0")) || isPlaywright;
      const signPayload = supportsSep53
        ? encodeSep53Message(blob.message)
        : Buffer.from(blob.message, "base64");
      response = sourceKeys.sign(signPayload);
    }

    const blobResponse = responseQueue.pop();

    if (typeof blobResponse === "function") {
      blobResponse(response, sourceKeys.publicKey());
      return {};
    }
  }

  return { error: "Session timed out" };
};
