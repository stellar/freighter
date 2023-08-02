import { EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { sendMessageToContentScript } from "./helpers/extensionMessaging";
import { UserInfo } from "./types";

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
  opts?:
    | string
    | {
        network?: string;
        accountToSign?: string;
        networkPassphrase?: string;
      },
  accountToSign?: string,
): Promise<string> => {
  let network = "";
  let _accountToSign = "";
  let networkPassphrase = "";

  /* 
  As of v1.3.0, this method now accepts an object as its second param. 
  Previously, it accepted optional second and third string parameters.
  This logic maintains backwards compatibility for older versions
  */
  if (typeof opts === "object") {
    network = opts.network || "";
    _accountToSign = opts.accountToSign || "";
    networkPassphrase = opts.networkPassphrase || "";
  } else {
    network = opts || "";
    _accountToSign = accountToSign || "";
  }

  let response = { signedTransaction: "", error: "" };
  try {
    response = await sendMessageToContentScript({
      transactionXdr,
      network,
      networkPassphrase,
      accountToSign: _accountToSign,
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

export const submitBlob = async (
  blob: string,
  opts: {
    accountToSign: string;
  },
): Promise<string> => {
  let response = { signedBlob: "", error: "" };
  const { accountToSign } = opts;
  try {
    response = await sendMessageToContentScript({
      blob,
      accountToSign,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_BLOB,
    });
  } catch (e) {
    console.error(e);
  }
  const { signedBlob, error } = response;

  if (error) {
    throw error;
  }
  return signedBlob;
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

export const requestNetworkDetails = async (): Promise<{
  network: string;
  networkUrl: string;
  networkPassphrase: string;
}> => {
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
      type: EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK_DETAILS,
    });
  } catch (e) {
    console.error(e);
  }

  const { networkDetails, error } = response;
  const { network, networkUrl, networkPassphrase } = networkDetails;

  if (error) {
    throw error;
  }
  return { network, networkUrl, networkPassphrase };
};

export const requestConnectionStatus = async (): Promise<boolean> => {
  let response = {
    isConnected: false,
  };

  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_CONNECTION_STATUS,
    });
  } catch (e) {
    console.error(e);
  }

  return response.isConnected;
};

export const requestAllowedStatus = async (): Promise<boolean> => {
  let response = {
    isAllowed: false,
  };

  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_ALLOWED_STATUS,
    });
  } catch (e) {
    console.error(e);
  }

  return response.isAllowed;
};

export const setAllowedStatus = async (): Promise<boolean> => {
  let response = {
    isAllowed: false,
    error: "",
  };

  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.SET_ALLOWED_STATUS,
    });
  } catch (e) {
    console.error(e);
  }

  const { isAllowed, error } = response;

  if (error) {
    throw error;
  }
  return isAllowed;
};

export const requestUserInfo = async (): Promise<UserInfo> => {
  let response = { userInfo: { publicKey: "" }, error: "" };
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_USER_INFO,
    });
  } catch (e) {
    console.error(e);
  }

  const { userInfo, error } = response;

  if (error) {
    throw error;
  }
  return userInfo;
};
