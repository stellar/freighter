import { submitAuthEntry } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const signAuthEntry = async (
  entryXdr: string,
  opts?: {
    address?: string;
  }
): Promise<
  | { signedAuthEntry: string; signerAddress: string }
  | { error: FreighterApiError | string }
> => {
  if (isBrowser) {
    const req = await submitAuthEntry(entryXdr, opts);

    if (req.error) {
      return { error: req.error };
    }

    return {
      signedAuthEntry: req.signedAuthEntry,
      signerAddress: req.signerAddress,
    };
  }

  return { error: FreighterApiNodeError };
};
