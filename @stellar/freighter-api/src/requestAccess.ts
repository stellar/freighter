import { requestAccess as requestAccessApi } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const requestAccess = async (): Promise<
  { address: string } | { error: FreighterApiError }
> => {
  if (isBrowser) {
    const req = await requestAccessApi();

    if (req.error) {
      return { error: req.error };
    }

    return { address: req.publicKey };
  }

  return { error: FreighterApiNodeError };
};
