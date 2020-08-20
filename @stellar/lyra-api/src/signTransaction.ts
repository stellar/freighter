import { submitTransaction } from "@shared/api/external";
import { LyraApiRequest } from "@shared/api/types";

export const signTransaction = async (params: LyraApiRequest) => {
  let response = { signedTransaction: "", error: "" };

  try {
    response = await submitTransaction(params);
  } catch (e) {
    console.error(e);
  }

  return response;
};
