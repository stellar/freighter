import React from "react";
import { useSelector } from "react-redux";
import { Routes, Route, Navigate } from "react-router-dom";

import {
  transactionSubmissionSelector,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { getPathFromRoute } from "popup/helpers/route";

export const ManageAssets = () => {
  const { accountBalances, destinationBalances, assetSelect } = useSelector(
    transactionSubmissionSelector
  );

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
      <Navigate
        to={{
          pathname: ROUTES.account,
        }}
      />
    );
  }

  const manageAssetsBasePath = "/manage-assets/";
  const searchAssetsPath = getPathFromRoute({
    fullRoute: ROUTES.searchAsset,
    basePath: manageAssetsBasePath,
  });
  const addAssetsPath = getPathFromRoute({
    fullRoute: ROUTES.addAsset,
    basePath: manageAssetsBasePath,
  });

  return (
    <>
      <Routes>
        <Route
          index
          element={
            <PrivateKeyRoute>
              <ChooseAsset balances={balances} />
            </PrivateKeyRoute>
          }
        ></Route>
        <Route
          path={searchAssetsPath}
          element={
            <PrivateKeyRoute>
              <SearchAsset />
            </PrivateKeyRoute>
          }
        ></Route>
        <Route
          path={addAssetsPath}
          element={
            <PrivateKeyRoute>
              <AddAsset />
            </PrivateKeyRoute>
          }
        ></Route>
      </Routes>
    </>
  );
};
