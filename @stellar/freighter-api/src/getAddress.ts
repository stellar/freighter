import { requestPublicKey } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const getAddress = async (): Promise<
  { address: string } | { error: FreighterApiError | string }
> => {
  if (isBrowser) {
    const req = await requestPublicKey();

    if (req.error) {
      return { error: req.error };
    }

    return { address: req.publicKey };
  }

  return { error: FreighterApiNodeError };
};
