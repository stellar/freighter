import { requestConnectionStatus } from "@shared/api/external";
import { isBrowser } from ".";

export const isConnected = (): Promise<boolean> => {
  if (!isBrowser) return Promise.resolve(false);

  if (window.freighter) {
    return Promise.resolve(window.freighter);
  }

  return requestConnectionStatus();
};
