import { submitTransaction as submitTransactionService } from "api/external";
import { ExternalRequest } from "api/types";

const submitTransaction = async (params: ExternalRequest) => {
  let response = { transactionStatus: "", error: "" };

  try {
    response = await submitTransactionService(params);
  } catch (e) {
    console.error(e);
  }

  return response;
};

export default submitTransaction;
