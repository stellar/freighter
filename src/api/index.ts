import connect from "./connect";
import submitTransaction from "./submitTransaction";

const injectApi = () => {
  return {
    connect,
    submitTransaction,
  };
};

declare global {
  interface Window {
    lyra: any;
  }
}

window.lyra = injectApi();
