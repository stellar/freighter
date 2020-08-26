import { EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { sendMessageToContentScript } from "./helpers";
import { LyraApiRequest } from "./types";

export const requestPublicKey = async (): Promise<string> => {
  let response = { publicKey: "", error: "" };
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }

  const { publicKey, error } = response;

  if (error) {
    throw error;
  }
  return publicKey;
};

export const submitTransaction = async ({
  transactionXdr,
}: LyraApiRequest): Promise<string> => {
  let response = { signedTransaction: "", error: "" };
  try {
    response = await sendMessageToContentScript({
      transactionXdr,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
  const { signedTransaction, error } = response;

  if (error) {
    throw error;
  }
  return signedTransaction;
};
