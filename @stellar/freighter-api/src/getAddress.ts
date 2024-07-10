import { requestPublicKey } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const getAddress = async (): Promise<
  Partial<{ address: string }> & { error?: FreighterApiError }
> => {
  if (isBrowser) {
    const req = await requestPublicKey();
    const address = req.publicKey;

    if (req.error) {
      return { error: req.error };
    }

    return { address };
  }

  return { error: FreighterApiNodeError };
};
