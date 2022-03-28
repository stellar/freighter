import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Redirect, Route, Switch } from "react-router-dom";

import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";

import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { TrustlineError } from "popup/components/manageAssets/TrustlineError";

import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

export const ManageAssets = () => {
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const [errorAsset, setErrorAsset] = useState("");

  const { balances } = accountBalances;

  if (!balances) {
    return (
      <Redirect
        to={{
          pathname: ROUTES.account,
        }}
      />
    );
  }

  return (
    <>
      <Switch>
        <PrivateKeyRoute exact path={ROUTES.manageAssets}>
          <ChooseAsset balances={balances} setErrorAsset={setErrorAsset} />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.addAsset}>
          <AddAsset setErrorAsset={setErrorAsset} />
        </PrivateKeyRoute>
        <Route exact path={ROUTES.trustlineError}>
          <TrustlineError balances={balances} errorAsset={errorAsset} />
        </Route>
      </Switch>
    </>
  );
};
