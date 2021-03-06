export interface SendResponseInterface {
  publicKey?: string;
  hasPrivateKey?: boolean;
  applicationState?: string;
  mnemonicPhrase?: string;
  isCorrectPhrase?: boolean;
  signedTransaction?: string;
  error?: string;
  isDataSharingAllowed?: boolean;
}

export interface MessageResponder {
  [key: string]: () => void;
}
