import { submitTransaction } from "lyra-core/api/external";
import { ExternalRequest } from "lyra-core/api/types";

export const signTransaction = async (params: ExternalRequest) => {
  let response = { transactionStatus: "", error: "" };

  try {
    response = await submitTransaction(params);
  } catch (e) {
    console.error(e);
  }

  return response;
};
