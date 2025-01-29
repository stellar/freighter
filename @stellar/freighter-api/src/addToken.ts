import { submitToken } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const addToken = async (args: {
  contractId: string;
  networkPassphrase?: string;
}): Promise<{ contractId: string } & { error?: FreighterApiError }> => {
  if (isBrowser) {
    const req = await submitToken(args);

    if (req.error) {
      return { contractId: "", error: req.error };
    }

    return { contractId: req.contractId || "" };
  }

  return { contractId: "", error: FreighterApiNodeError };
};
