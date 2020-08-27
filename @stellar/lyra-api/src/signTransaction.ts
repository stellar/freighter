import { submitTransaction } from "@shared/api/external";
import { LyraApiRequest } from "@shared/api/types";

export const signTransaction = (params: LyraApiRequest) =>
  submitTransaction(params);
