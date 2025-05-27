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
} from "@shared/api/types/message-request";

export const signTransaction = async ({
  localStore,
  sessionStore,
  transactionQueue,
  responseQueue,
}: {
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

  if (privateKey.length) {
    const sourceKeys = Sdk.Keypair.fromSecret(privateKey);

    let response = "";

    const transactionToSign = transactionQueue.pop();

    if (transactionToSign) {
      try {
        transactionToSign.sign(sourceKeys);
        response = transactionToSign.toXDR();
      } catch (e) {
        console.error(e);
        return { error: e };
      }
    }

    const transactionResponse = responseQueue.pop();

    if (typeof transactionResponse === "function") {
      transactionResponse(response, sourceKeys.publicKey());
      return {};
    }
  }

  return { error: "Session timed out" };
};
