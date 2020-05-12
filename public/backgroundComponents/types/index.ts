export interface Sender {
  tab?: chrome.tabs.Tab;
}

export interface SendResponseInterface {
  publicKey?: string;
  applicationState?: string;
  mnemonicPhrase?: string;
  isCorrectPhrase?: boolean;
  transactionStatus?: string;
  error?: string;
}
