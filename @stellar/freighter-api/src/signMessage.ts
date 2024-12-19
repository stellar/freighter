import packageJson from "../package.json";
import semver from "semver";
import { Buffer } from "buffer";

import { submitMessage } from "@shared/api/external";
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
  }
): Promise<SignMessageV3Response | SignMessageV4Response> => {
  if (isBrowser) {
    const req = await submitMessage(message, opts);

    if (req.error) {
      return { signedMessage: null, signerAddress: "", error: req.error };
    }

    if (semver.gte(packageJson.version, "4.0.0") && req.signedMessage) {
      const signedMessage = Buffer.from(req.signedMessage).toString("base64");
      return {
        signedMessage,
        signerAddress: req.signerAddress,
      };
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
