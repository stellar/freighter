import React from "react";
import { useSelector } from "react-redux";
import { Redirect, Route, Switch } from "react-router-dom";

import {
  transactionSubmissionSelector,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

export const ManageAssets = () => {
  const { accountBalances, destinationBalances, assetSelect, error } =
    useSelector(transactionSubmissionSelector);
  const { networkPassphrase } = useSelector(settingsNetworkDetailsSelector);
  const [errorAsset, setErrorAsset] = useState("");

  useEffect(() => {
    const xdrEnvelope = error?.response?.extras?.envelope_xdr;
    if (xdrEnvelope) {
      const parsedTx = TransactionBuilder.fromXDR(
        xdrEnvelope,
        networkPassphrase,
      );

      if ("operations" in parsedTx) {
        const op = parsedTx.operations[0];

        if ("line" in op) {
          const { code, issuer } = op.line as Asset;
          const asset = `${code}:${issuer}`;
          setErrorAsset(asset);
        }
      }
    }
  }, [error, networkPassphrase]);

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
        <Route exact path={ROUTES.addAsset}>
          <AddAsset />
        </Route>
      </Switch>
    </>
  );
};
