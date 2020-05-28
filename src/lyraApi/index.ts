import getPublicKey from "./getPublicKey";
import requestSignature from "./requestSignature";

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
