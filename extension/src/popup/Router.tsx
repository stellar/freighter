import React, { useEffect } from "react";
import {
  HashRouter,
  Switch,
  Redirect,
  Route,
  useLocation,
  RouteProps,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { POPUP_WIDTH } from "constants/dimensions";
import { newTabHref } from "helpers/urls";

import { ROUTES } from "popup/constants/routes";
import {
  applicationStateSelector,
  hasPrivateKeySelector,
  loadAccount,
  publicKeySelector,
  authErrorSelector,
} from "popup/ducks/authServices";
import { navigate } from "popup/ducks/views";

import { Account } from "popup/views/Account";
import { AccountCreator } from "popup/views/AccountCreator";
import { GrantAccess } from "popup/views/GrantAccess";
import { MnemonicPhrase } from "popup/views/MnemonicPhrase";
import { FullscreenSuccessMessage } from "popup/views/FullscreenSuccessMessage";
import { RecoverAccount } from "popup/views/RecoverAccount";
import { SignTransaction } from "popup/views/SignTransaction";
import { UnlockAccount } from "popup/views/UnlockAccount";
import { Welcome } from "popup/views/Welcome";
import { Loading } from "popup/views/Loading";
import { AppError } from "popup/views/AppError";
import { UnlockBackupPhrase } from "popup/views/UnlockBackupPhrase";
import { DisplayBackupPhrase } from "popup/views/DisplayBackupPhrase";
import { Debug } from "popup/views/Debug";
import { ViewPublicKey } from "popup/views/ViewPublicKey";

import { Header } from "popup/components/Header";

import "popup/metrics/views";
import { DEVELOPMENT } from "@shared/constants/services";

const PublicKeyRoute = (props: RouteProps) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const publicKey = useSelector(publicKeySelector);
  const error = useSelector(authErrorSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }
  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return <Loading />;
  }
  if (applicationState === APPLICATION_STATE.APPLICATION_STARTED) {
    return (
      <Redirect
        to={{
          pathname: "/",
        }}
      />
    );
  }
  if (!publicKey) {
    return (
      <Redirect
        to={{
          pathname: ROUTES.unlockAccount,
          search: location.search,
          state: { from: location },
        }}
      />
    );
  }
  return <Route {...props} />;
};

const PrivateKeyRoute = (props: RouteProps) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const error = useSelector(authErrorSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }
  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return <Loading />;
  }
  if (!hasPrivateKey) {
    return (
      <Redirect
        to={{
          pathname: ROUTES.unlockAccount,
          search: location.search,
          state: { from: location },
        }}
      />
    );
  }
  return <Route {...props} />;
};

/*
We don't know if the user is missing their public key because
a) it’s in the keystore in localstorage and it needs to be extracted or b) the account doesn’t exist at all.
We are checking for applicationState here to find out if the account doesn’t exist
If an account doesn't exist, go to the <Welcome /> page; otherwise, go to <UnlockAccount/>
*/

const UnlockAccountRoute = (props: RouteProps) => {
  const applicationState = useSelector(applicationStateSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_STARTED) {
    return (
      <Redirect
        to={{
          pathname: "/",
        }}
      />
    );
  }
  return <Route {...props} />;
};

const HomeRoute = () => {
  const applicationState = useSelector(applicationStateSelector);
  const publicKey = useSelector(publicKeySelector);
  const error = useSelector(authErrorSelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }
  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return <Loading />;
  }
  if (!publicKey) {
    if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
      return <Redirect to={ROUTES.unlockAccount} />;
    }

    /*
    We want to launch the extension in a new tab for a user still in the onboarding process.
    In this particular case, open the tab if we are in the "popup" view.
    */
    if (window.innerWidth === POPUP_WIDTH) {
      window.open(newTabHref(ROUTES.welcome));
      window.close();
    }
    return <Welcome />;
  }

  switch (applicationState) {
    case APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED:
      return <Redirect to={ROUTES.account} />;
    case APPLICATION_STATE.PASSWORD_CREATED ||
      APPLICATION_STATE.MNEMONIC_PHRASE_FAILED:
      window.open(newTabHref(ROUTES.mnemonicPhrase));
      return <Loading />;
    default:
      return <Welcome />;
  }
};

// Broadcast to Redux when the route changes. We don't store location state, but
// we do use the actions for metrics.
const RouteListener = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    dispatch(navigate(location));
  }, [dispatch, location]);

  return null;
};

export const Router = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadAccount());
  }, [dispatch]);

  return (
    <HashRouter>
      <RouteListener />
      <Switch>
        <PublicKeyRoute path={ROUTES.account}>
          <Header />
          <Account />
        </PublicKeyRoute>
        <PublicKeyRoute path={ROUTES.viewPublicKey}>
          <ViewPublicKey />
        </PublicKeyRoute>
        <PrivateKeyRoute path={ROUTES.signTransaction}>
          <Header />
          <SignTransaction />
        </PrivateKeyRoute>
        <PublicKeyRoute path={ROUTES.displayBackupPhrase}>
          <DisplayBackupPhrase />
        </PublicKeyRoute>
        <PublicKeyRoute path={ROUTES.grantAccess}>
          <Header />
          <GrantAccess />
        </PublicKeyRoute>
        <PublicKeyRoute path={ROUTES.mnemonicPhrase}>
          <Header />
          <MnemonicPhrase />
        </PublicKeyRoute>
        <PublicKeyRoute path={ROUTES.unlockBackupPhrase}>
          <UnlockBackupPhrase />
        </PublicKeyRoute>
        <UnlockAccountRoute path={ROUTES.unlockAccount}>
          <Header />
          <UnlockAccount />
        </UnlockAccountRoute>
        <PublicKeyRoute path={ROUTES.mnemonicPhraseConfirmed}>
          <Header />
          <FullscreenSuccessMessage />
        </PublicKeyRoute>
        <Route path={ROUTES.accountCreator}>
          <Header />
          <AccountCreator />
        </Route>
        <Route path={ROUTES.recoverAccount}>
          <Header />
          <RecoverAccount />
        </Route>
        <PublicKeyRoute path={ROUTES.recoverAccountSuccess}>
          <Header />
          <FullscreenSuccessMessage />
        </PublicKeyRoute>
        <HomeRoute />
        {DEVELOPMENT && (
          <Route path={ROUTES.debug}>
            <Debug />
          </Route>
        )}
      </Switch>
    </HashRouter>
  );
};
