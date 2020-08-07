import { EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { sendMessageToContentScript } from "./helpers";
import { LyraApiRequest } from "./types";

export const requestPublicKey = async (): Promise<{
  publicKey: string;
  error: string;
}> => {
  let response = { publicKey: "", error: "" };
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};

export const submitTransaction = async ({
  transactionXdr,
}: LyraApiRequest): Promise<{
  signedTransaction: string;
  error: string;
}> => {
  let response = { signedTransaction: "", error: "" };
  try {
    response = await sendMessageToContentScript({
      transactionXdr,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};
