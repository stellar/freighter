import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Redirect, Route, Switch } from "react-router-dom";
import StellarSdk from "stellar-sdk";

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

import { getNetworkDetails } from "background/helpers/account";

export const ManageAssets = () => {
  const {
    accountBalances,
    destinationBalances,
    assetSelect,
    error,
  } = useSelector(transactionSubmissionSelector);
  const [errorAsset, setErrorAsset] = useState("");

  React.useEffect(() => {
    const parseXdr = async () => {
      const { networkPassphrase } = await getNetworkDetails();
      const xdrEnvelope = error?.response?.extras.envelope_xdr;
      if (xdrEnvelope) {
        const parsedTx = StellarSdk.TransactionBuilder.fromXDR(
          xdrEnvelope,
          networkPassphrase,
        );
        const { code, issuer } = parsedTx._operations[0].line;
        const asset = `${code}:${issuer}`;
        setErrorAsset(asset);
      }
    };

    parseXdr();
  }, [error]);

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
          <ChooseAsset balances={balances} />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.searchAsset}>
          <SearchAsset />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.addAsset}>
          <AddAsset />
        </PrivateKeyRoute>
        <Route exact path={ROUTES.trustlineError}>
          <TrustlineError balances={balances} errorAsset={errorAsset} />
        </Route>
      </Switch>
    </>
  );
};
