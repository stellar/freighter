import { setAllowedStatus } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const setAllowed = async (): Promise<
  { isAllowed: boolean } | { error: FreighterApiError }
> => {
  if (isBrowser) {
    const req = await setAllowedStatus();

    if (req.error) {
      return { error: req.error };
    }

    return { isAllowed: req.isAllowed };
  }

  return { error: FreighterApiNodeError };
};
