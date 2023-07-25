import { submitTransaction } from "@shared/api/external";
import { isBrowser } from ".";

export const signTransaction = (
  blob: string,
  opts?: {
    network?: string;
    networkPassphrase?: string;
    accountToSign?: string;
  }
): Promise<string> =>
  isBrowser ? submitTransaction(blob, opts) : Promise.resolve("");
