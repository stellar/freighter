import { requestAccess } from "services/external";

const connect = async () => {
  let response = { publicKey: "", error: "" };

  try {
    response = await requestAccess();
  } catch (e) {
    console.error(e);
  }

  return response;
};

export default connect;
