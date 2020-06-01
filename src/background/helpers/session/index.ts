import { Key } from "@stellar/wallet-sdk/dist/types";

const SESSION_LENGTH = 5;

export const KEY_STORE: {
  publicKey: string;
  privateKey: string;
  [key: string]: string;
} = {
  publicKey: "",
  privateKey: "",
};

interface UiData {
  publicKey: string;
  mnemonicPhrase: string;
}

export const uiData: UiData = {
  publicKey: KEY_STORE.publicKey || "",
  mnemonicPhrase: "",
};

export const startSession = (keyStore: Key) => {
  KEY_STORE.publicKey = keyStore.publicKey;
  KEY_STORE.privateKey = keyStore.privateKey;

  uiData.publicKey = KEY_STORE.publicKey || "";
};

export const endSession = () => {
  Object.keys(KEY_STORE).forEach((key) => {
    KEY_STORE[key] = "";
  });
  uiData.publicKey = "";
};

export class SessionTimer {
  DURATION = 1000 * 60 * SESSION_LENGTH;
  constructor(duration?: number) {
    this.DURATION = duration || this.DURATION;
  }

  startTimer(keyStore: Key) {
    startSession(keyStore);
    setTimeout(endSession, this.DURATION);
  }
}
