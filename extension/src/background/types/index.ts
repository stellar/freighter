export interface Sender {
  tab?: chrome.tabs.Tab;
}

export interface SendResponseInterface {
  publicKey?: string;
  hasPrivateKey?: boolean;
  applicationState?: string;
  mnemonicPhrase?: string;
  isCorrectPhrase?: boolean;
  signedTransaction?: string;
  error?: string;
}

export interface MessageResponder {
  [key: string]: () => void;
}
