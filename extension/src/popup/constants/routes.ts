export enum ROUTES {
  debug = "/debug",
  integrationTest = "/integration-test",
  welcome = "/",
  account = "/account",
  viewPublicKey = "/account/view-public-key",
  importAccount = "/account/import",
  connectWallet = "/account/connect",
  connectWalletPlugin = "/account/connect/plugin",
  connectLedger = "/account/connect/ledger",
  accountHistory = "/account-history",
  sendPayment = "/account/sendPayment",
  sendPaymentTo = "/account/sendPayment/to",
  sendPaymentAmount = "/account/sendPayment/amount",
  sendPaymentType = "/account/sendPayment/amount/type",
  sendPaymentSettings = "/account/sendPayment/settings",
  sendPaymentSettingsFee = "/account/sendPayment/settings/fee",
  sendPaymentSettingsSlippage = "/account/sendPayment/settings/slippage",
  sendPaymentConfirm = "/account/sendPayment/confirm",
  swap = "/swap",
  swapAmount = "/swap/amount",
  swapSettings = "/swap/settings",
  swapSettingsFee = "/swap/settings/fee",
  swapSettingsSlippage = "/swap/settings/slippage",
  swapConfirm = "/swap/confirm",
  addAccount = "/add-account",
  signTransaction = "/sign-transaction",
  grantAccess = "/grant-access",
  mnemonicPhrase = "/mnemonic-phrase",
  mnemonicPhraseConfirm = "/mnemonic-phrase/confirm",
  mnemonicPhraseConfirmed = "/mnemonic-phrase-confirmed",
  pinExtension = "/pin-extension",
  unlockAccount = "/unlock-account",
  verifyAccount = "/verify-account",
  accountCreator = "/account-creator",
  recoverAccount = "/recover-account",
  recoverAccountSuccess = "/recover-account-success",
  settings = "/settings",
  displayBackupPhrase = "/settings/display-backup-phrase",
  about = "/settings/about",
  preferences = "/settings/preferences",
  security = "/settings/security",
  manageAssets = "/manage-assets",
  addAsset = "/manage-assets/add-asset",
  searchAsset = "/manage-assets/search-asset",
  trustlineError = "/manage-assets/trustline-error",
  manageNetwork = "/manage-network",
  addNetwork = "/manage-network/add-network",
  editNetwork = "/manage-network/edit-network",
  networkSettings = "/manage-network/network-settings",
  buyAsset = "/buy",
  buyMoneyGram = "/buy/moneygram",
}
