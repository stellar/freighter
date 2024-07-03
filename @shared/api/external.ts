import { EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { NetworkDetails } from "../constants/stellar";
import {
  sendMessageToContentScript,
  FreighterApiInternalError,
} from "./helpers/extensionMessaging";
import { UserInfo, FreighterApiError } from "./types";

export const requestAccess = async (): Promise<string> => {
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

export const requestPublicKey = async (): Promise<{
  publicKey: string;
  error?: FreighterApiError;
}> => {
  let response;
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_PUBLIC_KEY,
    });
  } catch (e) {
    console.error(e);
  }

  return { publicKey: response?.publicKey || "", error: response?.apiError };
};

export const submitTransaction = async (
  transactionXdr: string,
  opts?:
    | string
    | {
        accountToSign?: string;
        networkPassphrase?: string;
      },
  accountToSign?: string,
): Promise<{
  signedTransaction: string;
  signerAddress: string;
  error?: FreighterApiError;
}> => {
  let network = "";
  let _accountToSign = "";
  let networkPassphrase = "";

  /* 
  As of v1.3.0, this method now accepts an object as its second param. 
  Previously, it accepted optional second and third string parameters.
  This logic maintains backwards compatibility for older versions
  */
  if (typeof opts === "object") {
    _accountToSign = opts.accountToSign || "";
    networkPassphrase = opts.networkPassphrase || "";
  } else {
    network = opts || "";
    _accountToSign = accountToSign || "";
  }

  let response;
  try {
    response = await sendMessageToContentScript({
      transactionXdr,
      network,
      networkPassphrase,
      accountToSign: _accountToSign,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION,
    });
  } catch (e) {
    return {
      signedTransaction: "",
      signerAddress: "",
      error: FreighterApiInternalError,
    };
  }
  const { signedTransaction, signerAddress } = response;

  return { signedTransaction, signerAddress, error: response?.apiError };
};

export const submitBlob = async (
  blob: string,
  opts?: {
    accountToSign?: string;
  },
): Promise<{
  signedMessage: string;
  signerAddress: string;
  error?: FreighterApiError;
}> => {
  let response;
  const _opts = opts || {};
  const accountToSign = _opts.accountToSign || "";
  try {
    response = await sendMessageToContentScript({
      blob,
      accountToSign,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_BLOB,
    });
  } catch (e) {
    return {
      signedMessage: "",
      signerAddress: "",
      error: FreighterApiInternalError,
    };
  }
  const { signedBlob, signerAddress } = response;

  return {
    signedMessage: signedBlob,
    signerAddress,
    error: response?.apiError,
  };
};

export const submitAuthEntry = async (
  entryXdr: string,
  opts?: {
    address?: string;
    networkPassphrase?: string;
  },
): Promise<{
  signedAuthEntry: string;
  signerAddress: string;
  error?: FreighterApiError;
}> => {
  const _opts = opts || {};
  const accountToSign = _opts.address || "";
  let response;
  try {
    response = await sendMessageToContentScript({
      entryXdr,
      accountToSign,
      networkPassphrase: opts?.networkPassphrase,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_AUTH_ENTRY,
    });
  } catch (e) {
    console.error(e);
    return {
      signedAuthEntry: "",
      signerAddress: "",
      error: FreighterApiInternalError,
    };
  }
  const { signedAuthEntry, signerAddress } = response;

  return { signedAuthEntry, signerAddress, error: response?.apiError };
};

export const requestNetwork = async (): Promise<{
  network: string;
  networkPassphrase: string;
  error?: FreighterApiError;
}> => {
  let response;
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK_DETAILS,
    });
  } catch (e) {
    console.error(e);
  }

  const { networkDetails } = response || {
    networkDetails: { network: "", networkPassphrase: "" },
  };
  const { network, networkPassphrase } = networkDetails;

  return {
    network,
    networkPassphrase: networkPassphrase,
    error: response?.apiError,
  };
};

export const requestNetworkDetails = async (): Promise<{
  network: string;
  networkUrl: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
}> => {
  let response = {
    networkDetails: {
      network: "",
      networkName: "",
      networkUrl: "",
      networkPassphrase: "",
      sorobanRpcUrl: undefined,
    } as NetworkDetails,
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
  const { network, networkUrl, networkPassphrase, sorobanRpcUrl } =
    networkDetails;

  if (error) {
    throw error;
  }
  return { network, networkUrl, networkPassphrase, sorobanRpcUrl };
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
