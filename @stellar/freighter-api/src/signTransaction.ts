import { submitTransaction } from "@shared/api/external";
import { FreighterApiError } from "@shared/api/types";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { isBrowser } from ".";

export const signTransaction = async (
  transactionXdr: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
  },
): Promise<
  { signedTxXdr: string; signerAddress: string } & {
    error?: FreighterApiError;
  }
> => {
  if (isBrowser) {
    const req = await submitTransaction(transactionXdr, opts);

    if (req.error) {
      return { signedTxXdr: "", signerAddress: "", error: req.error };
    }

    return {
      signedTxXdr: req.signedTransaction,
      signerAddress: req.signerAddress,
    };
  }

  return { signedTxXdr: "", signerAddress: "", error: FreighterApiNodeError };
};
