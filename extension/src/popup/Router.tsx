import React, { JSX, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Navigate,
  Route,
  useLocation,
  Outlet,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { ROUTES } from "popup/constants/routes";
import {
  applicationStateSelector,
  hasPrivateKeySelector,
  authErrorSelector,
} from "popup/ducks/accountServices";
import { settingsStateSelector } from "popup/ducks/settings";
import { navigate } from "popup/ducks/views";

import { AppError } from "popup/components/AppError";

import { Account } from "popup/views/Account";
import { AccountHistory } from "popup/views/AccountHistory";
import { AccountCreator } from "popup/views/AccountCreator";
import { AddAccount } from "popup/views/AddAccount/AddAccount";
import { ManageConnectedApps } from "popup/views/ManageConnectedApps";
import { ManageAssetsLists } from "popup/views/ManageAssetsLists";
import { ImportAccount } from "popup/views/AddAccount/ImportAccount";
import { SelectHardwareWallet } from "popup/views/AddAccount/connect/SelectHardwareWallet";
import { PluginWallet } from "popup/views/AddAccount/connect/PluginWallet";
import { DeviceConnect } from "popup/views/AddAccount/connect/DeviceConnect";
import { GrantAccess } from "popup/views/GrantAccess";
import { MnemonicPhrase } from "popup/views/MnemonicPhrase";
import { FullscreenSuccessMessage } from "popup/views/FullscreenSuccessMessage";
import { RecoverAccount } from "popup/views/RecoverAccount";
import { AddToken } from "popup/views/AddToken";
import { SignTransaction } from "popup/views/SignTransaction";
import { SignAuthEntry } from "popup/views/SignAuthEntry";
import { UnlockAccount } from "popup/views/UnlockAccount";
import { Welcome } from "popup/views/Welcome";
import { DisplayBackupPhrase } from "popup/views/DisplayBackupPhrase";
import { Debug } from "popup/views/Debug";
import { IntegrationTest } from "popup/views/IntegrationTest";
import { ViewPublicKey } from "popup/views/ViewPublicKey";
import { Settings } from "popup/views/Settings";
import { Preferences } from "popup/views/Preferences";
import { Security } from "popup/views/Security";
import { AdvancedSettings } from "popup/views/AdvancedSettings";
import { About } from "popup/views/About";
import { SendPayment } from "popup/views/SendPayment";
import { ManageAssets } from "popup/views/ManageAssets";
import { VerifyAccount } from "popup/views/VerifyAccount";
import { Swap } from "popup/views/Swap";
import { ManageNetwork } from "popup/views/ManageNetwork";
import { LeaveFeedback } from "popup/views/LeaveFeedback";
import { AccountMigration } from "popup/views/AccountMigration";
import { AddFunds } from "popup/views/AddFunds";
import { Discover } from "popup/views/Discover";

import "popup/metrics/views";
import { DEV_SERVER } from "@shared/constants/services";
import { SettingsState } from "@shared/api/types";

import { SignMessage } from "./views/SignMessage";
import { ReviewAuth } from "./views/ReviewAuth";

import { View } from "./basics/layout/View";
import { BottomNav } from "./components/BottomNav";
import { useIsSwap } from "./helpers/useIsSwap";
import { AppDispatch } from "./App";

/*
We don't know if the user is missing their public key because
a) it’s in the keystore in localstorage and it needs to be extracted or b) the account doesn’t exist at all.
We are checking for applicationState here to find out if the account doesn’t exist
If an account doesn't exist, go to the <Welcome /> page; otherwise, go to <UnlockAccount/>
*/

const UnlockAccountRoute = ({ children }: { children: JSX.Element }) => {
  const applicationState = useSelector(applicationStateSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_STARTED) {
    return (
      <Navigate
        to={{
          pathname: "/",
        }}
      />
    );
  }
  return children;
};

export const VerifiedAccountRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const location = useLocation();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  if (!hasPrivateKey) {
    return (
      <Navigate to={ROUTES.verifyAccount} state={{ from: location }} replace />
    );
  }
  return children;
};

// Broadcast to Redux when the route changes. We don't store location state, but
// we do use the actions for metrics.
const RouteListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const settingsState = useSelector(settingsStateSelector);

  useEffect(() => {
    if (settingsState === SettingsState.SUCCESS) {
      dispatch(navigate(location));
    }
  }, [dispatch, location, settingsState]);

  return null;
};

const SHOW_NAV_ROUTES = [
  ROUTES.account,
  ROUTES.accountHistory,
  ROUTES.settings,
  ROUTES.connectWallet,
  ROUTES.connectWalletPlugin,
];

const NO_APP_LAYOUT_ROUTES = [
  ROUTES.mnemonicPhrase,
  ROUTES.mnemonicPhraseConfirmed,
  ROUTES.accountCreator,
  ROUTES.accountMigration,
  ROUTES.recoverAccount,
  ROUTES.recoverAccountSuccess,
  ROUTES.welcome,
];

const Layout = () => {
  const location = useLocation();
  const isSwap = useIsSwap();

  const applicationState = useSelector(applicationStateSelector);
  const error = useSelector(authErrorSelector);

  const showNav =
    location.pathname &&
    ((location.pathname === ROUTES.welcome &&
      applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) ||
      SHOW_NAV_ROUTES.some((route) => location.pathname === route) ||
      (isSwap && location.pathname !== ROUTES.unlockAccount));

  const isAppLayout = NO_APP_LAYOUT_ROUTES.every(
    (route) => route !== location.pathname,
  );

  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }

  return (
    <View isAppLayout={isAppLayout}>
      <Outlet />
      {showNav && <BottomNav />}
    </View>
  );
};

export const Router = () => (
  <HashRouter>
    <RouteListener />
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Account />}></Route>
        <Route
          path={ROUTES.accountHistory}
          element={<AccountHistory />}
        ></Route>
        <Route path={ROUTES.addAccount} element={<AddAccount />}></Route>
        <Route path={ROUTES.addToken} element={<AddToken />}></Route>
        <Route path={ROUTES.importAccount} element={<ImportAccount />}></Route>
        <Route
          path={ROUTES.connectWallet}
          element={<SelectHardwareWallet />}
        ></Route>
        <Route
          path={ROUTES.connectWalletPlugin}
          element={<PluginWallet />}
        ></Route>
        <Route path={ROUTES.connectDevice} element={<DeviceConnect />}></Route>
        <Route path={ROUTES.viewPublicKey} element={<ViewPublicKey />}></Route>
        <Route
          path={ROUTES.signTransaction}
          element={<SignTransaction />}
        ></Route>
        <Route
          path={ROUTES.reviewAuthorization}
          element={<ReviewAuth />}
        ></Route>
        <Route path={ROUTES.signAuthEntry} element={<SignAuthEntry />}></Route>
        <Route path={ROUTES.signMessage} element={<SignMessage />}></Route>
        <Route
          path={ROUTES.displayBackupPhrase}
          element={<DisplayBackupPhrase />}
        ></Route>
        <Route path={ROUTES.grantAccess} element={<GrantAccess />}></Route>
        <Route
          path={ROUTES.mnemonicPhrase}
          element={<MnemonicPhrase mnemonicPhrase="" />}
        ></Route>
        <Route path={ROUTES.settings} element={<Settings />}></Route>
        <Route path={ROUTES.preferences} element={<Preferences />}></Route>
        <Route path={ROUTES.security} element={<Security />}></Route>
        <Route path={ROUTES.about} element={<About />}></Route>
        <Route path={ROUTES.leaveFeedback} element={<LeaveFeedback />}></Route>
        <Route
          path={ROUTES.unlockAccount}
          element={
            <UnlockAccountRoute>
              <UnlockAccount />
            </UnlockAccountRoute>
          }
        ></Route>
        <Route
          path={ROUTES.mnemonicPhraseConfirmed}
          element={<FullscreenSuccessMessage />}
        ></Route>
        <Route
          path={ROUTES.accountCreator}
          element={<AccountCreator />}
        ></Route>
        <Route
          path={ROUTES.recoverAccount}
          element={<RecoverAccount />}
        ></Route>
        <Route path={ROUTES.verifyAccount} element={<VerifyAccount />}></Route>
        <Route
          path={ROUTES.recoverAccountSuccess}
          element={<FullscreenSuccessMessage />}
        ></Route>
        <Route
          path={`${ROUTES.sendPayment}/*`}
          element={<SendPayment />}
        ></Route>
        <Route
          path={`${ROUTES.manageAssets}/*`}
          element={<ManageAssets />}
        ></Route>
        <Route path={ROUTES.swap} element={<Swap />}></Route>
        <Route path={`${ROUTES.swap}/*`} element={<Swap />}></Route>
        <Route
          path={`${ROUTES.manageNetwork}/*`}
          element={<ManageNetwork />}
        ></Route>
        <Route
          path={ROUTES.manageConnectedApps}
          element={<ManageConnectedApps />}
        ></Route>
        <Route
          path={`${ROUTES.manageAssetsLists}/*`}
          element={<ManageAssetsLists />}
        ></Route>
        <Route
          path={`${ROUTES.accountMigration}/*`}
          element={<AccountMigration />}
        ></Route>
        <Route
          path={ROUTES.advancedSettings}
          element={<AdvancedSettings />}
        ></Route>
        <Route path={ROUTES.addFunds} element={<AddFunds />} />
        <Route path={ROUTES.discover} element={<Discover />} />

        {DEV_SERVER && (
          <>
            <Route path={ROUTES.debug} element={<Debug />}></Route>
            <Route
              path={ROUTES.integrationTest}
              element={<IntegrationTest />}
            ></Route>
          </>
        )}
        <Route path={ROUTES.welcome} element={<Welcome />} />
      </Route>
    </Routes>
  </HashRouter>
);
