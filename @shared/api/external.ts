import { EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { NetworkDetails } from "../constants/stellar";
import {
  sendMessageToContentScript,
  FreighterApiInternalError,
} from "./helpers/extensionMessaging";
import { FreighterApiError } from "./types";

export const requestAccess = async (): Promise<{
  publicKey: string;
  error?: FreighterApiError;
}> => {
  let response;
  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }

  const { publicKey } = response || { publicKey: "" };

  return { publicKey, error: response?.apiError };
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

export const submitToken = async (args: {
  contractId: string;
  networkPassphrase?: string;
}): Promise<{
  contractId?: string;
  error?: FreighterApiError;
}> => {
  let response;
  try {
    response = await sendMessageToContentScript({
      contractId: args.contractId,
      networkPassphrase: args.networkPassphrase,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_TOKEN,
    });
  } catch (e) {
    return {
      error: FreighterApiInternalError,
    };
  }

  return {
    contractId: response.contractId,
    error: response?.apiError,
  };
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
  signature: string;
  error?: FreighterApiError;
}> => {
  let network;
  let _accountToSign;
  let networkPassphrase;

  /* 
  As of v1.3.0, this method now accepts an object as its second param. 
  Previously, it accepted optional second and third string parameters.
  This logic maintains backwards compatibility for older versions
  */
  if (typeof opts === "object") {
    _accountToSign = opts.accountToSign;
    networkPassphrase = opts.networkPassphrase;
  } else {
    network = opts;
    _accountToSign = accountToSign;
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
      signature: "",
      error: FreighterApiInternalError,
    };
  }
  const { signedTransaction, signerAddress, signature } = response;

  return {
    signedTransaction,
    signerAddress,
    signature,
    error: response?.apiError,
  };
};

export const submitMessage = async (
  blob: string,
  version: string,
  opts?: {
    address?: string;
    networkPassphrase?: string;
  },
): Promise<{
  signedMessage: Buffer | null;
  signerAddress: string;
  error?: FreighterApiError;
}> => {
  let response;
  const _opts = opts || {};
  const accountToSign = _opts.address;
  try {
    response = await sendMessageToContentScript({
      blob,
      accountToSign,
      apiVersion: version,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_BLOB,
    });
  } catch (e) {
    return {
      signedMessage: null,
      signerAddress: "",
      error: FreighterApiInternalError,
    };
  }
  const { signedBlob, signerAddress } = response;

  return {
    signedMessage: signedBlob || null,
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
  signedAuthEntry: Buffer | null;
  signerAddress: string;
  error?: FreighterApiError;
}> => {
  const _opts = opts || {};
  const accountToSign = _opts.address;
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
      signedAuthEntry: null,
      signerAddress: "",
      error: FreighterApiInternalError,
    };
  }
  const { signedAuthEntry, signerAddress } = response;

  return {
    signedAuthEntry: signedAuthEntry || null,
    signerAddress,
    error: response?.apiError,
  };
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

  return {
    network: networkDetails?.network,
    networkPassphrase: networkDetails?.networkPassphrase,
    error: response?.apiError,
  };
};

export const requestNetworkDetails = async (): Promise<{
  network: string;
  networkUrl: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
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

  const { networkDetails, apiError } = response || {
    networkDetails: {
      network: "",
      networkName: "",
      networkUrl: "",
      networkPassphrase: "",
      sorobanRpcUrl: undefined,
      apiError: "",
    } as NetworkDetails,
  };

  const { network, networkUrl, networkPassphrase, sorobanRpcUrl } =
    networkDetails;

  return {
    network,
    networkUrl,
    networkPassphrase,
    sorobanRpcUrl,
    error: apiError,
  };
};

export const requestConnectionStatus = async (): Promise<{
  isConnected: boolean;
}> => {
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

  return { isConnected: response.isConnected };
};

export const requestAllowedStatus = async (): Promise<{
  isAllowed: boolean;
  error?: FreighterApiError;
}> => {
  let response;

  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_ALLOWED_STATUS,
    });
  } catch (e) {
    console.error(e);
  }

  const { isAllowed } = response || { isAllowed: false };

  return { isAllowed, error: response?.apiError };
};

export const setAllowedStatus = async (): Promise<{
  isAllowed: boolean;
  error?: FreighterApiError;
}> => {
  let response;

  try {
    response = await sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.SET_ALLOWED_STATUS,
    });
  } catch (e) {
    console.error(e);
  }

  const { isAllowed } = response || {
    isAllowed: false,
  };

  return { isAllowed, error: response?.apiError };
};
