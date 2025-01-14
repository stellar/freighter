export enum ROUTES {
  debug = "/debug",
  integrationTest = "/integration-test",
  welcome = "/",
  account = "/account",
  viewPublicKey = "/account/view-public-key",
  importAccount = "/account/import",
  connectWallet = "/account/connect",
  connectWalletPlugin = "/account/connect/plugin",
  connectDevice = "/account/connect/device",
  accountHistory = "/account-history",
  sendPayment = "/account/sendPayment",
  sendPaymentTo = "/account/sendPayment/to",
  sendPaymentAmount = "/account/sendPayment/amount",
  sendPaymentType = "/account/sendPayment/amount/type",
  sendPaymentSettings = "/account/sendPayment/settings",
  sendPaymentSettingsFee = "/account/sendPayment/settings/fee",
  sendPaymentSettingsSlippage = "/account/sendPayment/settings/slippage",
  sendPaymentSettingsTimeout = "/account/sendPayment/settings/timeout",
  sendPaymentConfirm = "/account/sendPayment/confirm",
  swap = "/swap",
  swapAmount = "/swap/amount",
  swapSettings = "/swap/settings",
  swapSettingsFee = "/swap/settings/fee",
  swapSettingsSlippage = "/swap/settings/slippage",
  swapSettingsTimeout = "/swap/settings/timeout",
  swapConfirm = "/swap/confirm",
  addAccount = "/add-account",
  signTransaction = "/sign-transaction",
  reviewAuthorization = "/review-auth",
  signMessage = "/sign-message",
  signAuthEntry = "/sign-auth-entry",
  grantAccess = "/grant-access",
  mnemonicPhrase = "/mnemonic-phrase",
  mnemonicPhraseConfirm = "/mnemonic-phrase/confirm",
  mnemonicPhraseConfirmed = "/mnemonic-phrase-confirmed",
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
  manageConnectedApps = "/settings/manageConnectedApps",
  leaveFeedback = "/settings/leave-feedback",
  manageAssetsLists = "/settings/manage-assets-lists",
  manageAssetsListsModifyAssetList = "/settings/manage-assets-lists/modify-asset-list",
  advancedSettings = "/settings/advanced-settings",

  manageAssets = "/manage-assets",
  searchAsset = "/manage-assets/search-asset",
  assetVisibility = "/manage-assets/asset-visibility",
  addAsset = "/manage-assets/add-asset",
  manageNetwork = "/manage-network",
  addNetwork = "/manage-network/add-network",
  editNetwork = "/manage-network/edit-network",
  networkSettings = "/manage-network/network-settings",
  accountMigration = "/account-migration",
  accountMigrationReviewMigration = "/account-migration/review-migration",
  accountMigrationMnemonicPhrase = "/account-migration/mnemonic-phrase",
  accountMigrationConfirmMigration = "/account-migration/confirm-migration",
  accountMigrationMigrationComplete = "/account-migration/migration-complete",
}
