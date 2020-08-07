import { submitTransaction } from "@sharedAlias/api/external";
import { LyraApiRequest } from "@sharedAlias/api/types";

export const signTransaction = async (params: LyraApiRequest) => {
  let response = { signedTransaction: "", error: "" };

  try {
    response = await submitTransaction(params);
  } catch (e) {
    console.error(e);
  }

  return response;
};
