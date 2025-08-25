import {
  requestAccess,
  requestAllowedStatus,
  submitAuthEntry,
} from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const signAuthEntry = async (
  entryXdr: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
  },
): Promise<
  { signedAuthEntry: Buffer | null; signerAddress: string } & {
    error?: FreighterApiError;
  }
> => {
  if (isBrowser) {
    const { isAllowed } = await requestAllowedStatus();
    if (!isAllowed) {
      const req = await requestAccess();

      if (req.error) {
        return { signedAuthEntry: null, signerAddress: "", error: req.error };
      }
    }

    const req = await submitAuthEntry(entryXdr, __PACKAGE_VERSION__, opts);

    if (req.error) {
      return { signedAuthEntry: null, signerAddress: "", error: req.error };
    }

    return {
      signedAuthEntry: req.signedAuthEntry,
      signerAddress: req.signerAddress,
    };
  }

  return {
    signedAuthEntry: null,
    signerAddress: "",
    error: FreighterApiNodeError,
  };
};
