import { setAllowedStatus } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const setAllowed = async (): Promise<
  { isAllowed: boolean } & { error?: FreighterApiError }
> => {
  let isAllowed = false;
  if (isBrowser) {
    const req = await setAllowedStatus();
    isAllowed = req.isAllowed;

    if (req.error) {
      return { isAllowed, error: req.error };
    }

    return { isAllowed };
  }

  return { isAllowed, error: FreighterApiNodeError };
};
