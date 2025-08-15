import { Buffer } from "buffer";

import {
  requestAllowedStatus,
  requestAccess,
  submitMessage,
} from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

type SignMessageV3Response = {
  signedMessage: Buffer | null;
  signerAddress: string;
} & {
  error?: FreighterApiError;
};

type SignMessageV4Response = {
  signedMessage: string;
  signerAddress: string;
} & {
  error?: FreighterApiError;
};

export const signMessage = async (
  message: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
  },
): Promise<SignMessageV3Response | SignMessageV4Response> => {
  if (isBrowser) {
    const { isAllowed } = await requestAllowedStatus();
    if (!isAllowed) {
      const req = await requestAccess();

      if (req.error) {
        return { signedMessage: null, signerAddress: "", error: req.error };
      }
    }

    const req = await submitMessage(message, __PACKAGE_VERSION__, opts);

    if (req.error) {
      return { signedMessage: null, signerAddress: "", error: req.error };
    }

    return {
      signedMessage: req.signedMessage,
      signerAddress: req.signerAddress,
    };
  }

  return {
    signedMessage: null,
    signerAddress: "",
    error: FreighterApiNodeError,
  };
};
