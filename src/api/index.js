// import { getPublicKey } from "services/external";
import connect from "./connect";
import submitTransaction from "./submitTransaction";

const injectApi = () => {
  return {
    connect,
    submitTransaction,
  };
};

window.lyra = injectApi();
