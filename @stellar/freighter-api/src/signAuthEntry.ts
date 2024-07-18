import { submitAuthEntry } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const signAuthEntry = async (
  entryXdr: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
  }
): Promise<
  { signedAuthEntry: string; signerAddress: string } & {
    error?: FreighterApiError;
  }
> => {
  if (isBrowser) {
    const req = await submitAuthEntry(entryXdr, opts);

    if (req.error) {
      return { signedAuthEntry: "", signerAddress: "", error: req.error };
    }

    return {
      signedAuthEntry: req.signedAuthEntry,
      signerAddress: req.signerAddress,
    };
  }

  return {
    signedAuthEntry: "",
    signerAddress: "",
    error: FreighterApiNodeError,
  };
};
