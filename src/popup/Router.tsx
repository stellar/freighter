import React, { useEffect } from "react";
import {
  HashRouter,
  Switch,
  Redirect,
  Route,
  useLocation,
  RouteProps,
} from "react-router-dom";
import { APPLICATION_STATE } from "statics";
import {
  applicationStateSelector,
  hasPrivateKeySelector,
  loadAccount,
  publicKeySelector,
} from "popup/ducks/authServices";
import { useSelector, useDispatch } from "react-redux";
import { newTabHref } from "helpers";
import { POPUP_WIDTH } from "popup/constants";

import Account from "popup/views/Account";
import CreatePassword from "popup/views/CreatePassword";
import { GrantAccess } from "popup/views/GrantAccess";
import MnemonicPhrase from "popup/views/MnemonicPhrase";
import MnemonicPhraseConfirmed from "popup/views/MnemonicPhrase/Confirmed";
import RecoverAccount from "popup/views/RecoverAccount";
import SignTransaction from "popup/views/SignTransaction";
import { UnlockAccount } from "popup/views/UnlockAccount";
import Welcome from "popup/views/Welcome";

const Loading = () => <p> Loading...</p>;

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
          pathname: "/unlock-account",
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
          pathname: "/unlock-account",
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
      return <UnlockAccount />;
    }

    /* 
    We want to launch the extension in a new tab for a user still in the onboarding process.
    In this particular case, open the tab if we are in the "popup" view.
    */
    if (window.innerWidth === POPUP_WIDTH) {
      window.open(newTabHref("/"));
    }
    return <Welcome />;
  }

  switch (applicationState) {
    case APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED:
      return <Account />;
    case APPLICATION_STATE.PASSWORD_CREATED ||
      APPLICATION_STATE.MNEMONIC_PHRASE_FAILED:
      window.open(newTabHref("/mnemonic-phrase"));
      return <Loading />;
    default:
      return <Welcome />;
  }
};

const Routes = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadAccount());
  }, [dispatch]);

  return (
    <HashRouter>
      <Switch>
        <PublicKeyRoute path="/account">
          <Account />
        </PublicKeyRoute>
        <PrivateKeyRoute path="/sign-transaction">
          <SignTransaction />
        </PrivateKeyRoute>
        <PublicKeyRoute path="/grant-access">
          <GrantAccess />
        </PublicKeyRoute>
        <PublicKeyRoute path="/mnemonic-phrase">
          <MnemonicPhrase />
        </PublicKeyRoute>
        <Route path="/unlock-account">
          <UnlockAccount />
        </Route>
        <Route path="/mnemonic-phrase-confirmed">
          <MnemonicPhraseConfirmed />
        </Route>
        <Route path="/create-password">
          <CreatePassword />
        </Route>
        <Route path="/recover-account">
          <RecoverAccount />
        </Route>
        <HomeRoute />
      </Switch>
    </HashRouter>
  );
};

export default Routes;
