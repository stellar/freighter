import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { getPathFromRoute } from "popup/helpers/route";

export const ManageAssets = () => {
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
              <ChooseAsset />
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
