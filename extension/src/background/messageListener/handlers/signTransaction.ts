import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import { captureException } from "@sentry/browser";
import { getNetworkDetails } from "background/helpers/account";
import { getSdk } from "@shared/helpers/stellar";
import {
  ResponseQueue,
  TransactionQueue,
  SignTransactionResponse,
  SignTransactionMessage,
} from "@shared/api/types/message-request";

export const signTransaction = async ({
  request,
  localStore,
  sessionStore,
  transactionQueue,
  responseQueue,
}: {
  request: SignTransactionMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  transactionQueue: TransactionQueue;
  responseQueue: ResponseQueue<SignTransactionResponse>;
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
      `Sign transaction: No private key found: ${JSON.stringify(e)}`,
    );
  }

  const networkDetails = await getNetworkDetails({ localStore });

  const Sdk = getSdk(networkDetails.networkPassphrase);

  const { uuid } = request;

  if (!uuid) {
    captureException("signTransaction: missing uuid in request");
    return { error: "Missing uuid" };
  }

  if (privateKey.length) {
    const sourceKeys = Sdk.Keypair.fromSecret(privateKey);

    let response = "";

    const queueIndex = transactionQueue.findIndex((item) => item.uuid === uuid);
    const transactionQueueItem =
      queueIndex !== -1 ? transactionQueue.splice(queueIndex, 1)[0] : undefined;

    if (transactionQueueItem) {
      const { transaction: transactionToSign } = transactionQueueItem;
      try {
        transactionToSign.sign(sourceKeys);
        response = transactionToSign.toXDR();
      } catch (e) {
        console.error(e);
        return { error: e };
      }
    }

    const responseIndex = responseQueue.findIndex((item) => item.uuid === uuid);
    const transactionResponse =
      responseIndex !== -1
        ? responseQueue.splice(responseIndex, 1)[0]
        : undefined;

    if (
      transactionResponse &&
      typeof transactionResponse.response === "function"
    ) {
      transactionResponse.response(response, sourceKeys.publicKey());
      return {};
    }

    captureException(
      `signTransaction: no matching response found for uuid ${uuid}`,
    );
  }

  return { error: "Session timed out" };
};
