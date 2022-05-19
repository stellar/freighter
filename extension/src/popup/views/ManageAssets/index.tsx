import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";

import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { TrustlineError } from "popup/components/manageAssets/TrustlineError";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { ASSET_SELECT } from "popup/components/sendPayment/SendAmount/AssetSelect";

export const ManageAssets = () => {
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const [errorAsset, setErrorAsset] = useState("");
  const { search } = useLocation();

  // find if from asset select input
  let selectingSourceAsset = false;
  let selectingDestAsset = false;
  const params = new URLSearchParams(search);
  switch (params.get(ASSET_SELECT.QUERY_PARAM)) {
    case ASSET_SELECT.SOURCE:
      selectingSourceAsset = true;
      break;
    case ASSET_SELECT.DEST:
      selectingDestAsset = true;
      break;
    default:
  }

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
          <ChooseAsset
            balances={balances}
            setErrorAsset={setErrorAsset}
            selectingSourceAsset={selectingSourceAsset}
            selectingDestAsset={selectingDestAsset}
          />
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
