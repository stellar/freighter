import { disconnect as disconnectSite } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const disconnect = async (): Promise<{ error?: FreighterApiError }> => {
  if (isBrowser) {
    return disconnectSite();
  }

  return { error: FreighterApiNodeError };
};
