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

import "popup/metrics/views";

const PublicKeyRoute = (props: RouteProps) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const publicKey = useSelector(publicKeySelector);

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

const HomeRoute = () => {
  const applicationState = useSelector(applicationStateSelector);
  const publicKey = useSelector(publicKeySelector);
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
          <Account />
        </PublicKeyRoute>
        <PrivateKeyRoute path={ROUTES.signTransaction}>
          <SignTransaction />
        </PrivateKeyRoute>
        <PublicKeyRoute path={ROUTES.grantAccess}>
          <GrantAccess />
        </PublicKeyRoute>
        <PublicKeyRoute path={ROUTES.mnemonicPhrase}>
          <MnemonicPhrase />
        </PublicKeyRoute>
        <Route path={ROUTES.unlockAccount}>
          <UnlockAccount />
        </Route>
        <Route path={ROUTES.mnemonicPhraseConfirmed}>
          <FullscreenSuccessMessage />
        </Route>
        <Route path={ROUTES.accountCreator}>
          <AccountCreator />
        </Route>
        <Route path={ROUTES.recoverAccount}>
          <RecoverAccount />
        </Route>
        <Route path={ROUTES.recoverAccountSuccess}>
          <FullscreenSuccessMessage />
        </Route>
        <HomeRoute />
      </Switch>
    </HashRouter>
  );
};
