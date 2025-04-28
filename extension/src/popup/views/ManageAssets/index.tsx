import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { AssetVisibility } from "popup/components/manageAssets/AssetVisibility";
import { ROUTES } from "popup/constants/routes";
import { getPathFromRoute } from "popup/helpers/route";

export const ManageAssets = () => {
  const navigate = useNavigate();

  const manageAssetsBasePath = "/manage-assets/";
  const searchAssetsPath = getPathFromRoute({
    fullRoute: ROUTES.searchAsset,
    basePath: manageAssetsBasePath,
  });
  const assetVisibility = getPathFromRoute({
    fullRoute: ROUTES.assetVisibility,
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
          element={<ChooseAsset goBack={() => navigate(-1)} showHideAssets />}
        ></Route>
        <Route path={searchAssetsPath} element={<SearchAsset />}></Route>
        <Route path={assetVisibility} element={<AssetVisibility />}></Route>
        <Route path={addAssetsPath} element={<AddAsset />}></Route>
      </Routes>
    </>
  );
};
