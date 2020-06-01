const SESSION_LENGTH = 5;

interface KeyStore {
  publicKey: string;
  privateKey: string;
  extra: { mnemonicPhrase: string };
}

export const KEY_STORE: {
  publicKey: string;
  privateKey: string;
  mnemonicPhrase: string;
  [key: string]: string;
} = {
  publicKey: "",
  privateKey: "",
  mnemonicPhrase: "",
};

export const startSession = (keyStore: KeyStore) => {
  KEY_STORE.publicKey = keyStore.publicKey;
  KEY_STORE.privateKey = keyStore.privateKey;
  KEY_STORE.mnemonicPhrase = keyStore.extra?.mnemonicPhrase;
};

export const endSession = () => {
  Object.keys(KEY_STORE).forEach((key) => {
    KEY_STORE[key] = "";
  });
};

export class SessionTimer {
  DURATION = 1000 * 60 * SESSION_LENGTH;
  constructor(duration?: number) {
    this.DURATION = duration || this.DURATION;
  }

  startTimer(keyStore: KeyStore) {
    startSession(keyStore);
    setTimeout(endSession, this.DURATION);
  }
}
