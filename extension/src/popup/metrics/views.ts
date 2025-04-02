import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";
import { getTransactionInfo } from "helpers/stellar";
import { parsedSearchParam, getUrlHostname, getUrlDomain } from "helpers/urls";

import { navigate } from "popup/ducks/views";
import { AppState } from "popup/App";
import { ROUTES } from "popup/constants/routes";

const routeToEventName = {
  [ROUTES.welcome]: METRIC_NAMES.viewWelcome,
  [ROUTES.account]: METRIC_NAMES.viewAccount,
  [ROUTES.accountHistory]: METRIC_NAMES.viewAccountHistory,
  [ROUTES.addAccount]: METRIC_NAMES.viewAddAccount,
  [ROUTES.importAccount]: METRIC_NAMES.viewImportAccount,
  [ROUTES.connectWallet]: METRIC_NAMES.viewConnectWallet,
  [ROUTES.connectWalletPlugin]: METRIC_NAMES.viewConnectWalletPlugin,
  [ROUTES.connectDevice]: METRIC_NAMES.viewConnectDevice,
  [ROUTES.addToken]: METRIC_NAMES.viewAddToken,
  [ROUTES.signMessage]: METRIC_NAMES.viewSignMessage,
  [ROUTES.signTransaction]: METRIC_NAMES.viewSignTransaction,
  [ROUTES.reviewAuthorization]: METRIC_NAMES.viewReviewAuthorization,
  [ROUTES.signAuthEntry]: METRIC_NAMES.viewSignAuthEntry,
  [ROUTES.grantAccess]: METRIC_NAMES.viewGrantAccess,
  [ROUTES.mnemonicPhrase]: METRIC_NAMES.viewMnemonicPhrase,
  [ROUTES.mnemonicPhraseConfirm]: METRIC_NAMES.viewMnemonicPhraseConfirm,
  [ROUTES.unlockAccount]: METRIC_NAMES.viewUnlockAccount,
  [ROUTES.verifyAccount]: METRIC_NAMES.viewVerifyAccount,
  [ROUTES.mnemonicPhraseConfirmed]: METRIC_NAMES.viewMnemonicPhraseConfirmed,
  [ROUTES.accountCreator]: METRIC_NAMES.viewAccountCreator,
  [ROUTES.recoverAccount]: METRIC_NAMES.viewRecoverAccount,
  [ROUTES.recoverAccountSuccess]: METRIC_NAMES.viewRecoverAccountSuccess,
  [ROUTES.displayBackupPhrase]: METRIC_NAMES.viewDisplayBackupPhrase,
  [ROUTES.settings]: METRIC_NAMES.viewSettings,
  [ROUTES.preferences]: METRIC_NAMES.viewPreferences,
  [ROUTES.security]: METRIC_NAMES.viewSecurity,
  [ROUTES.manageConnectedApps]: METRIC_NAMES.viewManageConnectedApps,
  [ROUTES.about]: METRIC_NAMES.viewAbout,
  [ROUTES.viewPublicKey]: METRIC_NAMES.viewPublicKey,
  [ROUTES.debug]: METRIC_NAMES.viewDebug,
  [ROUTES.integrationTest]: METRIC_NAMES.viewIntegrationTest,
  [ROUTES.sendPayment]: METRIC_NAMES.viewSendPayment,
  // [ROUTES.sendPaymentTo]: METRIC_NAMES.sendPaymentTo,
  // [ROUTES.sendPaymentAmount]: METRIC_NAMES.sendPaymentAmount,
  // [ROUTES.sendPaymentType]: METRIC_NAMES.sendPaymentType,
  // [ROUTES.sendPaymentSettings]: METRIC_NAMES.sendPaymentSettings,
  // [ROUTES.sendPaymentSettingsFee]: METRIC_NAMES.sendPaymentSettingsFee,
  // [ROUTES.sendPaymentSettingsSlippage]:
  //   METRIC_NAMES.sendPaymentSettingsSlippage,
  // [ROUTES.sendPaymentSettingsTimeout]: METRIC_NAMES.sendPaymentSettingsTimeout,
  // [ROUTES.sendPaymentConfirm]: METRIC_NAMES.sendPaymentConfirm,
  [ROUTES.manageAssets]: METRIC_NAMES.viewManageAssets,
  [ROUTES.searchAsset]: METRIC_NAMES.viewSearchAsset,
  [ROUTES.assetVisibility]: METRIC_NAMES.viewAssetVisibility,
  [ROUTES.addAsset]: METRIC_NAMES.viewAddAsset,
  [ROUTES.swap]: METRIC_NAMES.viewSwap,
  [ROUTES.swapAmount]: METRIC_NAMES.swapAmount,
  [ROUTES.swapSettings]: METRIC_NAMES.swapSettings,
  [ROUTES.swapSettingsFee]: METRIC_NAMES.swapSettingsFee,
  [ROUTES.swapSettingsSlippage]: METRIC_NAMES.swapSettingsSlippage,
  [ROUTES.swapSettingsTimeout]: METRIC_NAMES.swapSettingsTimeout,
  [ROUTES.swapConfirm]: METRIC_NAMES.swapConfirm,
  [ROUTES.manageNetwork]: METRIC_NAMES.viewManageNetwork,
  [ROUTES.addNetwork]: METRIC_NAMES.viewAddNetwork,
  [ROUTES.editNetwork]: METRIC_NAMES.viewEditNetwork,
  [ROUTES.networkSettings]: METRIC_NAMES.viewNetworkSettings,
  [ROUTES.leaveFeedback]: METRIC_NAMES.viewLeaveFeedback,
  [ROUTES.manageAssetsLists]: METRIC_NAMES.viewManageAssetsLists,
  [ROUTES.manageAssetsListsModifyAssetList]:
    METRIC_NAMES.manageAssetListsModifyAssetList,
  [ROUTES.accountMigration]: METRIC_NAMES.viewAccountMigration,
  [ROUTES.accountMigrationReviewMigration]:
    METRIC_NAMES.viewAccountMigrationReviewMigration,
  [ROUTES.accountMigrationMnemonicPhrase]:
    METRIC_NAMES.viewAccountMigrationMnemonicPhrase,
  [ROUTES.accountMigrationConfirmMigration]:
    METRIC_NAMES.viewAccountMigrationConfirmMigration,
  [ROUTES.accountMigrationMigrationComplete]:
    METRIC_NAMES.viewAccountMigrationMigrationComplete,
  [ROUTES.advancedSettings]: METRIC_NAMES.viewAdvancedSettings,
};

registerHandler<AppState>(navigate, (_, a) => {
  // Awkward, but gives us types on action payload
  const action = a as ReturnType<typeof navigate>;
  const { pathname, search } = action.payload.location;

  const eventName = routeToEventName[pathname as ROUTES];

  if (!eventName) {
    throw new Error(`Didn't find a metric event name for path '${pathname}'`);
  }

  // "/sign-transaction" and "/grant-access" require additional metrics on loaded page
  if (pathname === ROUTES.grantAccess) {
    const { url } = parsedSearchParam(search);
    const METRIC_OPTION_DOMAIN = {
      domain: getUrlDomain(url),
      subdomain: getUrlHostname(url),
    };

    emitMetric(eventName, METRIC_OPTION_DOMAIN);
  } else if (pathname === ROUTES.addToken) {
    const { url } = parsedSearchParam(search);
    const METRIC_OPTIONS = {
      domain: getUrlDomain(url),
      subdomain: getUrlHostname(url),
    };

    emitMetric(eventName, METRIC_OPTIONS);
  } else if (pathname === ROUTES.signTransaction) {
    const { url } = parsedSearchParam(search);
    const info = getTransactionInfo(search);

    const { operations, operationTypes } = info;
    const METRIC_OPTIONS = {
      domain: getUrlDomain(url),
      subdomain: getUrlHostname(url),

      number_of_operations: operations.length,
      operationTypes,
    };

    emitMetric(eventName, METRIC_OPTIONS);
  } else if (
    pathname === ROUTES.signAuthEntry ||
    pathname === ROUTES.signMessage
  ) {
    const { url } = parsedSearchParam(search);

    const METRIC_OPTIONS = {
      domain: getUrlDomain(url),
      subdomain: getUrlHostname(url),
    };

    emitMetric(eventName, METRIC_OPTIONS);
  } else {
    emitMetric(eventName);
  }
});
