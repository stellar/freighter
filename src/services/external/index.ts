import { EXTERNAL_SERVICE_TYPES } from "statics";
import { sendMessageAndAwaitResponseExternal } from "services/utils";
import { ExternalRequest } from "services/types";

// export const getPublicKey = async (): Promise<{ publicKey: string }> => {
//   let publicKey = "";

//   try {
//     ({ publicKey } = await sendMessageAndAwaitResponseExternal({
//       type: SERVICE_TYPES.LOAD_ACCOUNT,
//     }));
//   } catch (e) {
//     console.error(e);
//   }

//   return { publicKey };
// };

export const requestAccess = async (): Promise<{
  publicKey: string;
  error: string;
}> => {
  let response = { publicKey: "", error: "" };
  try {
    response = await sendMessageAndAwaitResponseExternal({
      type: EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
  console.log(response);
  return response;
};

export const submitTransaction = async ({
  transactionXdr,
}: ExternalRequest): Promise<{
  transactionStatus: string;
  error: string;
}> => {
  let response = { transactionStatus: "", error: "" };
  try {
    response = await sendMessageAndAwaitResponseExternal({
      transactionXdr,
      type: EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};
