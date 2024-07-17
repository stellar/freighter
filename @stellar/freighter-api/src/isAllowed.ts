import { requestAllowedStatus } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const isAllowed = async (): Promise<
  { isAllowed: boolean } & { error?: FreighterApiError }
> => {
  let isAllowed = false;
  if (isBrowser) {
    const req = await requestAllowedStatus();
    isAllowed = req.isAllowed;

    if (req.error) {
      return { isAllowed, error: req.error };
    }

    return { isAllowed };
  }

  return { isAllowed, error: FreighterApiNodeError };
};
