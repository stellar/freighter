import { submitTransaction } from "@shared/api/external";
import { isBrowser } from ".";

export const signTransaction = (
  transactionXdr: string,
  opts?: {
    network?: string;
    networkPassphrase?: string;
    accountToSign?: string;
  }
): Promise<string> =>
  isBrowser ? submitTransaction(transactionXdr, opts) : Promise.resolve("");
