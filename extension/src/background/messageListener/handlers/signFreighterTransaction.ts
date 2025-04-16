import { Store } from "redux";

import {
  SignFreighterSorobanTransactionMessage,
  SignFreighterTransactionMessage,
} from "@shared/api/types/message-request";
import { getSdk } from "@shared/helpers/stellar";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import { captureException } from "@sentry/browser";

export const signFreighterTransaction = async ({
  request,
  localStore,
  sessionStore,
}: {
  request:
    | SignFreighterTransactionMessage
    | SignFreighterSorobanTransactionMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { transactionXDR, network } = request;

  const Sdk = getSdk(network);

  const transaction = Sdk.TransactionBuilder.fromXDR(transactionXDR, network);
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
      `Sign freighter transaction: No private key found: ${JSON.stringify(e)}`,
    );
  }

  if (privateKey.length) {
    const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
    transaction.sign(sourceKeys);
    return { signedTransaction: transaction.toXDR() };
  }

  return { error: "Session timed out" };
};
