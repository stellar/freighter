import getPublicKey from "./getPublicKey";
import requestSignature from "./requestSignature";
import status from "./status";

const injectApi = () => ({
  getPublicKey,
  requestSignature,
  status,
});

declare global {
  interface Window {
    lyra: any;
  }
}

window.lyra = injectApi();
