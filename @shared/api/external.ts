import { EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { NetworkDetails } from "../constants/stellar";
import { sendMessageToContentScript } from "./helpers/extensionMessaging";

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

export const submitTransaction = async (
  transactionXdr: string,
  network?: string,
  networkPassphrase?: string,
  accountToSign?: string,
): Promise<string> => {
  let response = { signedTransaction: "", error: "" };
  try {
    response = await sendMessageToContentScript({
      transactionXdr,
      network,
      networkPassphrase,
      accountToSign,
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

export const requestNetwork = async (): Promise<NetworkDetails> => {
  let response = {
    networkDetails: {
      network: "",
      networkName: "",
      networkUrl: "",
      networkPassphrase: "",
    },
    error: "",
  };
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK,
    });
  } catch (e) {
    console.error(e);
  }

  const { networkDetails, error } = response;

  if (error) {
    throw error;
  }
  return networkDetails;
};
