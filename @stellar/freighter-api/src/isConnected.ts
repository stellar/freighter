import { requestConnectionStatus } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const isConnected = async (): Promise<
  { isConnected: boolean } & { error?: FreighterApiError }
> => {
  if (isBrowser) {
    if (window.freighter) {
      return Promise.resolve({ isConnected: window.freighter });
    }

    return requestConnectionStatus();
  }

  return { isConnected: false, error: FreighterApiNodeError };
};
