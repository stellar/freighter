import { requestConnectionStatus } from "@shared/api/external";

export const isConnected = () => {
  if (window?.freighter) {
    return window.freighter;
  }

  return requestConnectionStatus();
};
