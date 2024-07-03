import { submitMessage } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const signMessage = async (
  message: string,
  opts?: {
    accountToSign?: string;
  }
): Promise<
  | { signedMessage: string; signerAddress: string }
  | { error: FreighterApiError }
> => {
  if (isBrowser) {
    const req = await submitMessage(message, opts);

    if (req.error) {
      return { error: req.error };
    }

    return {
      signedMessage: req.signedMessage,
      signerAddress: req.signerAddress,
    };
  }

  return { error: FreighterApiNodeError };
};
