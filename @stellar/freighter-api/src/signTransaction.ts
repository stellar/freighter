import { submitTransaction } from "@shared/api/external";

export const signTransaction = (
  transactionXdr: string,
  network?: "PUBLIC" | "TESTNET",
  accountToSign?: string
) => submitTransaction(transactionXdr, network, accountToSign);
