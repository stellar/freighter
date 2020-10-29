import { submitTransaction } from "@shared/api/external";

export const signTransaction = (transactionXdr: string) =>
  submitTransaction(transactionXdr);
