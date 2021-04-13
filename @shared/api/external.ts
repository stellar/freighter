import { EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { NETWORKS } from "../constants/stellar";
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
): Promise<string> => {
  let response = { signedTransaction: "", error: "" };
  if (network !== NETWORKS.PUBLIC && network !== NETWORKS.TESTNET) {
    return `Network must be ${NETWORKS.PUBLIC} or ${NETWORKS.TESTNET}`;
  }
  try {
    response = await sendMessageToContentScript({
      transactionXdr,
      network,
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

export const requestNetwork = async (): Promise<string> => {
  let response = { network: "", error: "" };
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK,
    });
  } catch (e) {
    console.error(e);
  }

  const { network, error } = response;

  if (error) {
    throw error;
  }
  return network;
};
