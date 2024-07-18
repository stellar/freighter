import { submitMessage } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const signMessage = async (
  message: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
  }
): Promise<
  { signedMessage: string; signerAddress: string } & {
    error?: FreighterApiError;
  }
> => {
  if (isBrowser) {
    const req = await submitMessage(message, opts);

    if (req.error) {
      return { signedMessage: "", signerAddress: "", error: req.error };
    }

    return {
      signedMessage: req.signedMessage,
      signerAddress: req.signerAddress,
    };
  }

  return { signedMessage: "", signerAddress: "", error: FreighterApiNodeError };
};
