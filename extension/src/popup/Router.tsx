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
import { POPUP_WIDTH } from "constants/dimensions";
import { newTabHref } from "helpers/urls";
import { openTab } from "popup/helpers/navigate";

import { ROUTES } from "popup/constants/routes";
import {
  allAccountsSelector,
  applicationStateSelector,
  hasPrivateKeySelector,
  loadAccount,
  publicKeySelector,
  authErrorSelector,
} from "popup/ducks/accountServices";
import {
  loadSettings,
  settingsNetworkDetailsSelector,
  settingsStateSelector,
} from "popup/ducks/settings";
import { navigate } from "popup/ducks/views";

import { AppError } from "popup/components/AppError";
import { Loading } from "popup/components/Loading";

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

import "popup/metrics/views";
import { DEV_SERVER } from "@shared/constants/services";
import { SettingsState } from "@shared/api/types";

import { SignMessage } from "./views/SignMessage";
import { ReviewAuth } from "./views/ReviewAuth";

import { View } from "./basics/layout/View";
import { BottomNav } from "./components/BottomNav";
import { useIsSwap } from "./helpers/useIsSwap";
import { AppDispatch } from "./App";

export const PublicKeyRoute = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const publicKey = useSelector(publicKeySelector);
  const error = useSelector(authErrorSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }

  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return null;
  }

  if (applicationState === APPLICATION_STATE.APPLICATION_STARTED) {
    return (
      <Navigate
        to={{
          pathname: "/",
        }}
      />
    );
  }
  if (!publicKey) {
    return (
      <Navigate
        to={`${ROUTES.unlockAccount}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }
  return children;
};

export const PrivateKeyRoute = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const error = useSelector(authErrorSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }
  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return null;
  }
  if (!hasPrivateKey) {
    return (
      <Navigate
        to={`${ROUTES.unlockAccount}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }
  return children;
};

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

const HomeRoute = () => {
  const allAccounts = useSelector(allAccountsSelector);
  const applicationState = useSelector(applicationStateSelector);
  const publicKey = useSelector(publicKeySelector);
  const error = useSelector(authErrorSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }
  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return null;
  }

  if (!publicKey || !allAccounts.length) {
    if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
      return <Navigate to={ROUTES.unlockAccount} />;
    }

    /*
    We want to launch the extension in a new tab for a user still in the onboarding process.
    In this particular case, open the tab if we are in the "popup" view.
    */
    if (window.innerWidth === POPUP_WIDTH) {
      openTab(newTabHref(ROUTES.welcome));
      window.close();
    }
    return <Welcome />;
  }

  switch (applicationState) {
    case APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED:
      return <Navigate to={ROUTES.account} />;
    case APPLICATION_STATE.PASSWORD_CREATED:
    case APPLICATION_STATE.MNEMONIC_PHRASE_FAILED:
      openTab(newTabHref(ROUTES.mnemonicPhrase));
      return <Loading />;
    default:
      return <Welcome />;
  }
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
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const isSwap = useIsSwap();

  const applicationState = useSelector(applicationStateSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const settingsState = useSelector(settingsStateSelector);

  useEffect(() => {
    dispatch(loadAccount());
    dispatch(loadSettings());
  }, [dispatch]);

  const showNav =
    location.pathname &&
    ((location.pathname === ROUTES.welcome &&
      applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) ||
      SHOW_NAV_ROUTES.some((route) => location.pathname === route) ||
      (isSwap && location.pathname !== ROUTES.unlockAccount));

  const isAppLayout = NO_APP_LAYOUT_ROUTES.every(
    (route) => route !== location.pathname,
  );

  const isLoadingSettings =
    applicationState === APPLICATION_STATE.APPLICATION_LOADING ||
    settingsState === SettingsState.LOADING ||
    settingsState === SettingsState.IDLE ||
    !networkDetails.network;

  return (
    <View isAppLayout={isAppLayout}>
      {isLoadingSettings ? <Loading /> : <Outlet />}
      {showNav && <BottomNav />}
    </View>
  );
};

export const Router = () => (
  <HashRouter>
    <RouteListener />
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          path={ROUTES.account}
          element={
            <PublicKeyRoute>
              <Account />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.accountHistory}
          element={
            <PublicKeyRoute>
              <AccountHistory />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.addAccount}
          element={
            <PublicKeyRoute>
              <AddAccount />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.addToken}
          element={
            <PublicKeyRoute>
              <AddToken />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.importAccount}
          element={
            <PublicKeyRoute>
              <ImportAccount />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.connectWallet}
          element={
            <PublicKeyRoute>
              <SelectHardwareWallet />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.connectWalletPlugin}
          element={
            <PublicKeyRoute>
              <PluginWallet />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.connectDevice}
          element={
            <PublicKeyRoute>
              <DeviceConnect />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.viewPublicKey}
          element={
            <PublicKeyRoute>
              <ViewPublicKey />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.signTransaction}
          element={
            <PublicKeyRoute>
              <SignTransaction />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.reviewAuthorization}
          element={
            <PublicKeyRoute>
              <ReviewAuth />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.signAuthEntry}
          element={
            <PublicKeyRoute>
              <SignAuthEntry />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.signMessage}
          element={
            <PublicKeyRoute>
              <SignMessage />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.displayBackupPhrase}
          element={
            <PublicKeyRoute>
              <DisplayBackupPhrase />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.grantAccess}
          element={
            <PublicKeyRoute>
              <GrantAccess />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.mnemonicPhrase}
          element={
            <PublicKeyRoute>
              <MnemonicPhrase mnemonicPhrase="" />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.settings}
          element={
            <PublicKeyRoute>
              <Settings />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.preferences}
          element={
            <PublicKeyRoute>
              <Preferences />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.security}
          element={
            <PublicKeyRoute>
              <Security />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.about}
          element={
            <PublicKeyRoute>
              <About />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.leaveFeedback}
          element={
            <PublicKeyRoute>
              <LeaveFeedback />
            </PublicKeyRoute>
          }
        ></Route>
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
          element={
            <PublicKeyRoute>
              <FullscreenSuccessMessage />
            </PublicKeyRoute>
          }
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
          element={
            <PublicKeyRoute>
              <FullscreenSuccessMessage />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={`${ROUTES.sendPayment}/*`}
          element={
            <PublicKeyRoute>
              <SendPayment />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={`${ROUTES.manageAssets}/*`}
          element={
            <PublicKeyRoute>
              <ManageAssets />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.swap}
          element={
            <PublicKeyRoute>
              <Swap />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={`${ROUTES.swap}/*`}
          element={
            <PublicKeyRoute>
              <Swap />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={`${ROUTES.manageNetwork}/*`}
          element={
            <PublicKeyRoute>
              <ManageNetwork />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.manageConnectedApps}
          element={
            <PublicKeyRoute>
              <ManageConnectedApps />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={`${ROUTES.manageAssetsLists}/*`}
          element={
            <PublicKeyRoute>
              <ManageAssetsLists />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={`${ROUTES.accountMigration}/*`}
          element={
            <PublicKeyRoute>
              <AccountMigration />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={ROUTES.advancedSettings}
          element={
            <PublicKeyRoute>
              <AdvancedSettings />
            </PublicKeyRoute>
          }
        ></Route>

        {DEV_SERVER && (
          <>
            <Route path={ROUTES.debug} element={<Debug />}></Route>
            <Route
              path={ROUTES.integrationTest}
              element={<IntegrationTest />}
            ></Route>
          </>
        )}
        <Route index element={<HomeRoute />}></Route>
      </Route>
    </Routes>
  </HashRouter>
);
