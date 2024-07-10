import { requestAllowedStatus } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const isAllowed = async (): Promise<
  Partial<{ isAllowed: boolean }> & { error?: FreighterApiError }
> => {
  if (isBrowser) {
    const req = await requestAllowedStatus();

    if (req.error) {
      return { error: req.error };
    }

    return { isAllowed: req.isAllowed };
  }

  return { error: FreighterApiNodeError };
};
