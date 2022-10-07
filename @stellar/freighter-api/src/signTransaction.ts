import { submitTransaction } from "@shared/api/external";

export const signTransaction = (
  transactionXdr: string,
  opts?: {
    network?: string;
    networkPassphrase?: string;
    accountToSign?: string;
  }
) => submitTransaction(transactionXdr, opts);
