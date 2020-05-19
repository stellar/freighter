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

import Account from "views/Account";
import CreatePassword from "views/CreatePassword";
import GrantAccess from "views/GrantAccess";
import MnemonicPhrase from "views/MnemonicPhrase";
import MnemonicPhraseConfirmed from "views/MnemonicPhrase/Confirmed";
import RecoverAccount from "views/RecoverAccount";
import SignTransaction from "views/SignTransaction";
import UnlockAccount from "views/UnlockAccount";
import Welcome from "views/Welcome";

const ProtectedRoute = (props: RouteProps) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const authenticated = useSelector(authenticatedSelector);
  const publicKey = useSelector(publicKeySelector);

  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return <p>loading...</p>;
  }
  if (!publicKey || !authenticated) {
    return (
      <Redirect
        to={{
          pathname: "/recover-account",
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

  if (!publicKey) {
    if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
      return <UnlockAccount />;
    }
    return <Welcome />;
  }

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Account />;
  }

  return <Welcome />;
};

const Routes = () => {
  const applicationState = useSelector(applicationStateSelector);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadAccount());
  }, [dispatch]);

  return (
    <HashRouter>
      <Switch>
        <ProtectedRoute path="/account" component={Account} />
        <Route path="/unlock">
          <UnlockAccount />
        </Route>
        <ProtectedRoute path="/sign-transaction" component={SignTransaction} />
        <ProtectedRoute path="/grant-access" component={GrantAccess} />
        <ProtectedRoute path="/mnemonic-phrase" component={MnemonicPhrase} />

        <Route
          path="/mnemonic-phrase-confirmed"
          component={MnemonicPhraseConfirmed}
        />
        <Route path="/create-password" component={CreatePassword} />
        <Route path="/recover-account">
          {applicationState !== APPLICATION_STATE.APPLICATION_STARTED ? (
            <UnlockAccount />
          ) : (
            <RecoverAccount />
          )}
          <HomeRoute />
        </Route>
      </Switch>
    </HashRouter>
  );
};

export default Routes;
