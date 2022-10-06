import { submitTransaction } from "@shared/api/external";

export const signTransaction = (
  transactionXdr: string,
  network?: string,
  networkPassphrase?: string,
  accountToSign?: string
) =>
  submitTransaction(transactionXdr, {
    network,
    accountToSign,
    networkPassphrase,
  });
