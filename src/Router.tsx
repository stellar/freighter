import React from "react";
import { HashRouter, Switch, Redirect, Route } from "react-router-dom";
import { APPLICATION_STATE } from "statics";
import CreatePassword from "views/CreatePassword";
import MnemonicPhrase from "views/MnemonicPhrase";
import MnemonicPhraseConfirmed from "views/MnemonicPhraseConfirmed";
import RecoverAccount from "views/RecoverAccount";
import Welcome from "views/Welcome";

const AuthenticatedRoute = ({ applicationState, children, ...rest }) => {
  return (
    <Route
      {...rest}
      render={({ location }) => {
        if (!applicationState) {
          return (
            <Redirect
              to={{
                pathname: "/create-password",
                state: { from: location },
              }}
            />
          );
        }

        if (applicationState === APPLICATION_STATE.PASSWORD_CREATED) {
          return (
            <Redirect
              to={{
                pathname: "/mnemonic-phrase-confirm",
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

const Routes = ({ applicationState }: { applicationState: string }) => {
  return (
    <HashRouter>
      <Switch>
        <Route path="/mnemonic-phrase">
          <MnemonicPhrase />
        </Route>

        <Route
          applicationState={applicationState}
          path="/mnemonic-phrase-confirmed"
        >
          <MnemonicPhraseConfirmed />
        </Route>
        <Route path="/create-password">
          <CreatePassword />
        </Route>
        <Route path="/recover-account">
          <RecoverAccount />
        </Route>
        <Route applicationState={applicationState} path="/">
          <Welcome />
        </Route>
      </Switch>
    </HashRouter>
  );
};

export default Routes;
