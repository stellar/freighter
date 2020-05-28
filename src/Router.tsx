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
  authenticatedSelector,
  loadAccount,
  publicKeySelector,
} from "ducks/authServices";
import { useSelector, useDispatch } from "react-redux";
import { newTabHref } from "helpers";

import Account from "views/Account";
import CreatePassword from "views/CreatePassword";
import GrantAccess from "views/GrantAccess";
import MnemonicPhrase from "views/MnemonicPhrase";
import MnemonicPhraseConfirmed from "views/MnemonicPhrase/Confirmed";
import RecoverAccount from "views/RecoverAccount";
import SignTransaction from "views/SignTransaction";
import UnlockAccount from "views/UnlockAccount";
import Welcome from "views/Welcome";

const Loading = () => <p> Loading...</p>;

const ProtectedRoute = (props: RouteProps) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const authenticated = useSelector(authenticatedSelector);
  const publicKey = useSelector(publicKeySelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return <Loading />;
  }
  if (!publicKey || !authenticated) {
    if (applicationState === APPLICATION_STATE.APPLICATION_STARTED) {
      return (
        <Redirect
          to={{
            pathname: "/",
          }}
        />
      );
    }
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
  const location = useLocation();
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
    In this particular case, open the tab with a query param that stops subsequent redirects.
    */
    if (location.search !== "?sameTab=true") {
      window.open(newTabHref("/?sameTab=true"));
    }
    return <Welcome />;
  }

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Account />;
  }

  window.open(newTabHref("/mnemonic-phrase"));

  return <Welcome />;
};

const Routes = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadAccount());
  }, [dispatch]);

  return (
    <HashRouter>
      <Switch>
        <ProtectedRoute path="/account">
          <Account />
        </ProtectedRoute>
        <ProtectedRoute path="/sign-transaction">
          <SignTransaction />
        </ProtectedRoute>
        <ProtectedRoute path="/grant-access">
          <GrantAccess />
        </ProtectedRoute>
        <ProtectedRoute path="/mnemonic-phrase">
          <MnemonicPhrase />
        </ProtectedRoute>
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
