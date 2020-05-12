import { submitTransaction as submitTransactionService } from "services/external";
import { ExternalRequest } from "services/types";

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
