import { requestAccess } from "api/external";

export const getPublicKey = async () => {
  let response = { publicKey: "", error: "" };

  try {
    response = await requestAccess();
  } catch (e) {
    console.error(e);
  }

  return response;
};
