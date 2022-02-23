export enum ROUTES {
  debug = "/debug",
  welcome = "/",
  account = "/account",
  accountHistory = "/account-history",
  addAccount = "/add-account",
  importAccount = "/import-account",
  signTransaction = "/sign-transaction",
  grantAccess = "/grant-access",
  mnemonicPhrase = "/mnemonic-phrase",
  unlockAccount = "/unlock-account",
  mnemonicPhraseConfirmed = "/mnemonic-phrase-confirmed",
  accountCreator = "/account-creator",
  recoverAccount = "/recover-account",
  recoverAccountSuccess = "/recover-account-success",
  unlockBackupPhrase = "/unlock-backup-phrase",
  displayBackupPhrase = "/display-backup-phrase",
  viewPublicKey = "/view-public-key",
  settings = "/settings",
  preferences = "/preferences",
  sendPayment = "/sendPayment",

  // ALEC TODO - move somewhere?
  // payment nested routes
  sendPaymentTo = "/sendPayment/to",
  sendPaymentSettings = "/sendPayment/settings",
  sendPaymentConfirm = "/sendPayment/confirm",
}
