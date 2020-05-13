import React, { useEffect } from "react";
import { HashRouter, Switch, Redirect, Route } from "react-router-dom";
import { APPLICATION_STATE } from "statics";
import {
  applicationStateSelector,
  loadAccount,
  publicKeySelector,
} from "ducks/authServices";
import { useSelector } from "react-redux";

import Account from "views/Account";
import CreatePassword from "views/CreatePassword";
import GrantAccess from "views/GrantAccess";
import MnemonicPhrase from "views/MnemonicPhrase";
import MnemonicPhraseConfirmed from "views/MnemonicPhrase/Confirmed";
import RecoverAccount from "views/RecoverAccount";
import SignTransaction from "views/SignTransaction";
import UnlockAccount from "views/UnlockAccount";
import Welcome from "views/Welcome";

const ProtectedRoute = ({
  applicationState,
  publicKey,
  children,
  path,
  ...rest
}: {
  publicKey: string;
  applicationState: APPLICATION_STATE;
  children: JSX.Element;
  path: string;
}) => {
  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return <p>loading...</p>;
  }
  return (
    <Route
      path={path}
      {...rest}
      render={({ location }) => {
        if (!publicKey) {
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

        return children;
      }}
    />
  );
};

const HomeRoute = ({
  publicKey,
  applicationState,
}: {
  publicKey: string;
  applicationState: APPLICATION_STATE;
}) => {
  if (!publicKey) {
    if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
      return <UnlockAccount />;
    }
    return <Welcome />;
  }

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Account />;
  }

  return <UnlockAccount />;
};

const Routes = ({ store }: { store: any }) => {
  const applicationState = useSelector(applicationStateSelector);
  const publicKey = useSelector(publicKeySelector);
  useEffect(() => {
    store.dispatch(loadAccount());
  }, [store]);

  return (
    <HashRouter>
      <Switch>
        <ProtectedRoute
          applicationState={applicationState}
          publicKey={publicKey}
          path="/account"
        >
          <Account />
        </ProtectedRoute>
        <Route path="/unlock">
          <UnlockAccount />
        </Route>
        <ProtectedRoute
          path="/sign-transaction"
          publicKey={publicKey}
          applicationState={applicationState}
        >
          <SignTransaction />
        </ProtectedRoute>
        <ProtectedRoute
          path="/grant-access"
          publicKey={publicKey}
          applicationState={applicationState}
        >
          <GrantAccess />
        </ProtectedRoute>
        <Route path="/mnemonic-phrase">
          <MnemonicPhrase />
        </Route>

        <Route path="/mnemonic-phrase-confirmed">
          <MnemonicPhraseConfirmed />
        </Route>
        <Route path="/create-password">
          <CreatePassword />
        </Route>
        <Route path="/recover-account">
          {applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED ? (
            <UnlockAccount />
          ) : (
            <RecoverAccount />
          )}
        </Route>
        <HomeRoute publicKey={publicKey} applicationState={applicationState} />
      </Switch>
    </HashRouter>
  );
};

export default Routes;
