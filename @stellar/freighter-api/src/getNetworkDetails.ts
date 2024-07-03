import { requestNetworkDetails } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const getNetworkDetails = async (): Promise<
  | {
      network: string;
      networkUrl: string;
      networkPassphrase: string;
      sorobanRpcUrl?: string;
    }
  | { error: FreighterApiError }
> => {
  if (isBrowser) {
    const req = await requestNetworkDetails();

    if (req.error) {
      return { error: req.error };
    }

    return {
      network: req.network,
      networkUrl: req.networkUrl,
      networkPassphrase: req.networkPassphrase,
      sorobanRpcUrl: req.sorobanRpcUrl,
    };
  }

  return { error: FreighterApiNodeError };
};
