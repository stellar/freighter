import { requestNetwork } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const getNetwork = async (): Promise<
  { network: string; networkPassphrase: string } & {
    error?: FreighterApiError;
  }
> => {
  if (isBrowser) {
    const req = await requestNetwork();

    if (req.error) {
      return { network: "", networkPassphrase: "", error: req.error };
    }

    return { network: req.network, networkPassphrase: req.networkPassphrase };
  }

  return { network: "", networkPassphrase: "", error: FreighterApiNodeError };
};
