import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Redirect, Route, Switch } from "react-router-dom";

import {
  transactionSubmissionSelector,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { TrustlineError } from "popup/components/manageAssets/TrustlineError";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

export const ManageAssets = () => {
  const { accountBalances, destinationBalances, assetSelect } = useSelector(
    transactionSubmissionSelector,
  );
  const [errorAsset, setErrorAsset] = useState("");

  let balances;
  // path payment destAsset is the only time we use recipient trustlines
  if (
    assetSelect.type === AssetSelectType.PATH_PAY &&
    assetSelect.isSource === false
  ) {
    balances = destinationBalances.balances;
  } else {
    balances = accountBalances.balances;
  }

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
        <PrivateKeyRoute exact path={ROUTES.searchAsset}>
          <SearchAsset setErrorAsset={setErrorAsset} />
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
