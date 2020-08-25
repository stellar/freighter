import { requestPublicKey } from "@shared/api/external";

export const getPublicKey = async () => {
  let response = { publicKey: "", error: "" };

  try {
    response = await requestPublicKey();
  } catch (e) {
    console.error(e);
  }

  const { error } = response;

  if (error) {
    throw error;
  }

  return response.publicKey;
};
