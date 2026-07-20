export const METRIC_NAMES = {
  // Screen-load events are consolidated into the single canonical
  // `screen.viewed` event (see METRIC_NAMES.screenViewed below and
  // helpers/metrics#emitScreenViewed). Per-screen legacy "loaded screen: X"
  // names have been removed; screen identity now lives in the `screen_name`
  // property. Non-screen (domain/action) event names remain unchanged.

  sendPaymentRecentAddress: "send payment: recent address",
  sendPaymentSetMax: "send payment: set max",
  sendPaymentFeeBreakdownOpened: "send payment: fee breakdown opened",
  sendPaymentTypePayment: "send payment: selected type payment",
  sendPaymentTypePathPayment: "send payment: selected type path payment",
  sendPaymentSuccess: "send payment: payment success",
  sendPaymentPathPaymentSuccess: "send payment: path payment success",
  sendPaymentError: "send payment: error",
  simuilateTokenPaymentError: "failed to simulate token payment",

  swapPickerOpened: "swap: picker opened",
  swapAmountPercentageSet: "swap: amount percentage set",
  swapSourceSelected: "swap: source selected",
  swapDestinationSelected: "swap: destination selected",
  swapDirectionToggled: "swap: direction toggled",
  swapTrustlineAdded: "swap: trustline added",
  swapXlmReserveShown: "swap: xlm reserve shown",
  swapQuoteExpired: "swap: quote expired",
  swapSuccess: "swap: success",
  discoverProtocolOpened: "discover: protocol opened",
  discoverProtocolDetailsViewed: "discover: protocol details viewed",
  discoverProtocolOpenedFromDetails: "discover: protocol opened from details",
  discoverWelcomeModalViewed: "discover: welcome modal viewed",

  manageAssetAddAsset: "manage asset: add asset",
  manageAssetAddToken: "manage asset: add token",
  manageAssetAddUnsafeAsset: "manage asset: add unsafe asset",
  manageAssetRemoveAsset: "manage asset: remove asset",
  manageAssetError: "manage asset: error",

  manageAssetListsModifyAssetList: "manage asset list: modify asset list",

  accountCreatorSuccess: "account creator: create password: success",
  accountCreatorReject: "account creator: create password: error",

  accountCreatorMnemonicViewPhrase: "account creator: viewed phrase",

  accountCreatorMnemonicConfirmPhrase:
    "account creator: confirm phrase: confirmed phrase",
  accountCreatorConfirmMnemonicFail:
    "account creator: confirm phrase: error confirming",
  accountCreatorConfirmMnemonicBack:
    "account creator: confirm phrase: back to phrase",

  accountCreatorFinished:
    "account creator finished: closed account creator flow",

  accountScreenAddAccount: "account screen: created new account",
  accountScreenCopyPublickKey: "account screen: copied public key",
  accountScreenImportAccount: "account screen: imported new account",
  accountScreenImportAccountFail: "account screen: imported new account: error",

  freighterAccountFunded: "freighter created account funded",

  confirmPasswordSuccess: "re-auth: success",
  confirmPasswordFail: "re-auth: error",

  historyOpenFullHistory: "history: opened full history on external website",
  historyOpenItem: "history: opened item on external website",

  recoverAccountSuccess: "recover account: success",
  recoverAccountFail: "recover account: error",
  recoverAccountFinished:
    "recover account finished: closed recover account flow",

  grantAccessSuccess: "grant access: granted",
  grantAccessFail: "grant access: rejected",

  addToken: "add token: confirmed",
  rejectToken: "add token: rejected",

  signTransaction: "sign transaction: confirmed",
  signTransactionMemoRequired: "sign transaction: memo required error",
  rejectTransaction: "sign transaction: rejected",

  signBlob: "sign blob: confirmed",
  rejectBlob: "sign blob: rejected",

  signAuthEntry: "sign auth entry: confirmed",
  rejectAuthEntry: "sign auth entry: rejected",

  backupPhraseSuccess: "backup phrase: success",
  backupPhraseFail: "backup phrase: error",

  backupPhraseDownload: "backup phrase: downloaded phrase",
  backupPhraseCopy: "backup phrase: copied phrase",

  viewPublicKeyAccountRenamed: "viewPublicKey: renamed account",
  viewPublicKeyCopy: "viewPublicKey: copied public key",
  viewPublicKeyClickedStellarExpert: "viewPublicKey: clicked StellarExpert",

  invalidAuthEntry: "invalid authorization entry",

  tokenAddedApi: "user added token through api",
  tokenFailedApi: "failed adding token through api",
  tokenRejectApi: "user cancelled adding token through api",

  rejectSigning: "user cancelled signing flow",
  approveSign: "user signed transaction",
  reviewedAuthEntry: "reviewed authorization entry",

  trustlineErrorBuyingLiability:
    "trustline removal error: asset has buying liabilties",
  trustlineErrorHasBalance: "trustline removal error: asset has balance",
  trustlineErrorLowReserve: "trustline removal error: asset has low reserve",

  blockaidDomainScan: "blockaid: scanned domain",
  blockaidTxScan: "blockaid: scanned transaction",
  blockaidTxScanFailed: "blockaid: transaction scan failed",
  blockaidAssetScan: "blockaid: scanned asset",
  blockaidAssetScanFailed: "blockaid: asset scan failed",

  coinbaseOnrampOpened: "coinbase onramp: opened",

  appOpened: "app.opened",

  // Canonical, consolidated screen-view event. Screen identity is carried in
  // the `screen_name` property (plus `flow`, `surface`, and `step` where a
  // screen is a sub-step). See helpers/metrics#emitScreenViewed.
  screenViewed: "screen.viewed",
};
