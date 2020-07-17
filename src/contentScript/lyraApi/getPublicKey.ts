import { requestAccess } from "api/external";

const getPublicKey = async () => {
  let response = { publicKey: "", error: "" };

  try {
    response = await requestAccess();
  } catch (e) {
    console.error(e);
  }

  return response;
};

export default getPublicKey;
