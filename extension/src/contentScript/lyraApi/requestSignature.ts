import { submitTransaction as submitTransactionService } from "@lyra/api/external";
import { ExternalRequest } from "@lyra/api/types";

export const requestSignature = async (params: ExternalRequest) => {
  let response = { transactionStatus: "", error: "" };

  try {
    response = await submitTransactionService(params);
  } catch (e) {
    console.error(e);
  }

  return response;
};
