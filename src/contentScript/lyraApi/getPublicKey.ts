import { requestPublicKey } from "api/external";

export const getPublicKey = async () => {
  let response = { publicKey: "", error: "" };

  try {
    response = await requestPublicKey();
  } catch (e) {
    console.error(e);
  }

  return response;
};
