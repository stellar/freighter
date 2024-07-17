import { requestAccess as requestAccessApi } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const requestAccess = async (): Promise<
  { address: string } & { error?: FreighterApiError }
> => {
  let address = "";
  if (isBrowser) {
    const req = await requestAccessApi();
    address = req.publicKey;

    if (req.error) {
      return { address, error: req.error };
    }

    return { address };
  }

  return { address, error: FreighterApiNodeError };
};
