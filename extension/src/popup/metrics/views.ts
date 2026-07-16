import { METRIC_NAMES } from "popup/constants/metricsNames";

import {
  registerHandler,
  emitMetric,
  emitScreenViewed,
  Flow,
} from "helpers/metrics";
import { getTransactionInfo } from "helpers/stellar";
import { parsedSearchParam, getUrlHostname, getUrlDomain } from "helpers/urls";
import { isSidebarMode } from "popup/helpers/isSidebarMode";

import { navigate } from "popup/ducks/views";
import { AppState } from "popup/App";
import { ROUTES } from "popup/constants/routes";

interface ScreenDef {
  /**
   * Canonical, cross-platform screen name. Derived deterministically from the
   * legacy "loaded screen: X" string via helpers/metrics#toScreenName (kept as
   * a literal here so this map is the single source of truth).
   */
  screen_name: string;
  /** Product-area grouping; omit when no flow is a good fit. */
  flow?: Flow;
  /** Sub-step marker (used here for terminal completion/success screens). */
  step?: string;
}

/**
 * Single source of truth mapping each route to its canonical screen definition.
 * A navigate to any of these routes emits the consolidated `screen.viewed`
 * event carrying `screen_name` (+ `flow`/`step` where applicable). The legacy
 * per-screen "loaded screen: X" event names have been retired.
 *
 * Note: ROUTES.manageAssetsListsModifyAssetList is intentionally absent — it
 * historically emits a non-screen (action) event, which this change does not touch.
 */
const routeToScreen: Partial<Record<ROUTES, ScreenDef>> = {
  [ROUTES.welcome]: { screen_name: "welcome", flow: "onboarding" },
  [ROUTES.account]: { screen_name: "account" },
  [ROUTES.accountHistory]: { screen_name: "account_history", flow: "history" },
  [ROUTES.addAccount]: { screen_name: "add_account", flow: "onboarding" },
  [ROUTES.importAccount]: { screen_name: "import_account", flow: "onboarding" },
  [ROUTES.connectWallet]: { screen_name: "connect_wallet", flow: "onboarding" },
  [ROUTES.connectWalletPlugin]: {
    screen_name: "connect_wallet_plugin",
    flow: "onboarding",
  },
  [ROUTES.connectDevice]: { screen_name: "connect_device", flow: "onboarding" },
  [ROUTES.addToken]: { screen_name: "add_token", flow: "signing" },
  [ROUTES.signMessage]: { screen_name: "sign_message", flow: "signing" },
  [ROUTES.signTransaction]: {
    screen_name: "sign_transaction",
    flow: "signing",
  },
  [ROUTES.reviewAuthorization]: {
    screen_name: "review_authorization",
    flow: "signing",
  },
  [ROUTES.signAuthEntry]: { screen_name: "sign_auth_entry", flow: "signing" },
  [ROUTES.grantAccess]: { screen_name: "grant_access", flow: "signing" },
  [ROUTES.mnemonicPhrase]: {
    screen_name: "mnemonic_phrase",
    flow: "onboarding",
  },
  [ROUTES.mnemonicPhraseConfirm]: {
    screen_name: "confirm_mnemonic_phrase",
    flow: "onboarding",
  },
  [ROUTES.unlockAccount]: { screen_name: "unlock_account", flow: "security" },
  [ROUTES.verifyAccount]: { screen_name: "verify_account", flow: "security" },
  [ROUTES.mnemonicPhraseConfirmed]: {
    screen_name: "account_creator_finished",
    flow: "onboarding",
    step: "success",
  },
  [ROUTES.accountCreator]: {
    screen_name: "account_creator",
    flow: "onboarding",
  },
  [ROUTES.recoverAccount]: {
    screen_name: "recover_account",
    flow: "onboarding",
  },
  [ROUTES.recoverAccountSuccess]: {
    screen_name: "recover_account_success",
    flow: "onboarding",
    step: "success",
  },
  [ROUTES.displayBackupPhrase]: {
    screen_name: "display_backup_phrase",
    flow: "security",
  },
  [ROUTES.settings]: { screen_name: "settings", flow: "settings" },
  [ROUTES.preferences]: { screen_name: "preferences", flow: "settings" },
  [ROUTES.security]: { screen_name: "security", flow: "security" },
  [ROUTES.manageConnectedApps]: {
    screen_name: "manage_connected_apps",
    flow: "settings",
  },
  [ROUTES.about]: { screen_name: "about", flow: "settings" },
  [ROUTES.viewPublicKey]: { screen_name: "view_public_key_generator" },
  [ROUTES.debug]: { screen_name: "debug" },
  [ROUTES.integrationTest]: { screen_name: "integration_test" },
  [ROUTES.sendPayment]: { screen_name: "send_payment", flow: "send" },
  [ROUTES.addCollectibles]: { screen_name: "add_collectibles", flow: "assets" },
  [ROUTES.manageAssets]: { screen_name: "manage_assets", flow: "assets" },
  [ROUTES.searchAsset]: { screen_name: "search_asset", flow: "assets" },
  [ROUTES.assetVisibility]: { screen_name: "asset_visibility", flow: "assets" },
  [ROUTES.addAsset]: { screen_name: "add_asset_manually", flow: "assets" },
  [ROUTES.swap]: { screen_name: "swap", flow: "swap" },
  [ROUTES.manageNetwork]: { screen_name: "manage_network", flow: "settings" },
  [ROUTES.addNetwork]: { screen_name: "add_network", flow: "settings" },
  [ROUTES.editNetwork]: { screen_name: "edit_network", flow: "settings" },
  [ROUTES.networkSettings]: {
    screen_name: "network_settings",
    flow: "settings",
  },
  [ROUTES.leaveFeedback]: { screen_name: "leave_feedback", flow: "settings" },
  [ROUTES.manageAssetsLists]: {
    screen_name: "manage_assets_lists",
    flow: "assets",
  },
  [ROUTES.accountMigration]: {
    screen_name: "account_migration",
    flow: "security",
  },
  [ROUTES.accountMigrationReviewMigration]: {
    screen_name: "account_migration_review_migration",
    flow: "security",
  },
  [ROUTES.accountMigrationMnemonicPhrase]: {
    screen_name: "account_migration_mnemonic_phrase",
    flow: "security",
  },
  [ROUTES.accountMigrationConfirmMigration]: {
    screen_name: "account_migration_confirm_migration",
    flow: "security",
  },
  [ROUTES.accountMigrationMigrationComplete]: {
    screen_name: "account_migration_migration_complete",
    flow: "security",
    step: "success",
  },
  [ROUTES.advancedSettings]: {
    screen_name: "advanced_settings",
    flow: "settings",
  },
  [ROUTES.autoLockTimer]: { screen_name: "auto_lock_timer", flow: "security" },
  [ROUTES.addFunds]: { screen_name: "add_fund", flow: "assets" },
  [ROUTES.wallets]: { screen_name: "wallets" },
  [ROUTES.confirmSidebarRequest]: {
    screen_name: "confirm_sidebar_request",
    flow: "signing",
  },
};

/** Builds the screen.viewed props object, dropping any undefined flow/step. */
const screenProps = (
  screen: ScreenDef,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ...(screen.flow ? { flow: screen.flow } : {}),
  ...(screen.step ? { step: screen.step } : {}),
  ...extra,
});

registerHandler<AppState>(navigate, (_, a) => {
  // Awkward, but gives us types on action payload
  const action = a as ReturnType<typeof navigate>;
  const { pathname, search } = action.payload.location;

  // The modify-asset-list route historically emits a non-screen (action) event
  // rather than a screen-view. this change does not touch non-screen events, so
  // preserve it verbatim.
  if (pathname === ROUTES.manageAssetsListsModifyAssetList) {
    emitMetric(METRIC_NAMES.assetListModified);
    return;
  }

  const screen = routeToScreen[pathname as ROUTES];

  if (!screen) {
    throw new Error(`Didn't find a screen definition for path '${pathname}'`);
  }

  // "/sign-transaction" and "/grant-access" require additional metrics on loaded page
  const isSidebarModeActivated = isSidebarMode();

  if (pathname === ROUTES.grantAccess || pathname === ROUTES.addToken) {
    const { url } = parsedSearchParam(search);

    emitScreenViewed(
      screen.screen_name,
      screenProps(screen, {
        domain: getUrlDomain(url),
        subdomain: getUrlHostname(url),
        sidebarMode: isSidebarModeActivated,
      }),
    );
  } else if (pathname === ROUTES.signTransaction) {
    const { url } = parsedSearchParam(search);
    const info = getTransactionInfo(search);

    const { operations, operationTypes } = info;

    emitScreenViewed(
      screen.screen_name,
      screenProps(screen, {
        domain: getUrlDomain(url),
        subdomain: getUrlHostname(url),
        sidebarMode: isSidebarModeActivated,
        number_of_operations: operations.length,
        operationTypes,
      }),
    );
  } else if (
    pathname === ROUTES.signAuthEntry ||
    pathname === ROUTES.signMessage
  ) {
    const { url } = parsedSearchParam(search);

    emitScreenViewed(
      screen.screen_name,
      screenProps(screen, {
        domain: getUrlDomain(url),
        subdomain: getUrlHostname(url),
        sidebarMode: isSidebarModeActivated,
      }),
    );
  } else {
    emitScreenViewed(screen.screen_name, screenProps(screen));
  }
});
