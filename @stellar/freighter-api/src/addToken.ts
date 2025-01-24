import { submitToken } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const addToken = async (args: {
  contractId: string;
  networkPassphrase?: string;
}): Promise<{
  error?: FreighterApiError;
}> => {
  if (isBrowser) {
    const req = await submitToken(args);

    if (req.error) {
      return { error: req.error };
    }

    return {};
  }

  return { error: FreighterApiNodeError };
};
