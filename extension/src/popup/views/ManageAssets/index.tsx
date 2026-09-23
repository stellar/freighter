import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { ROUTES } from "popup/constants/routes";
import { getPathFromRoute } from "popup/helpers/route";

/**
 * Host for the add-asset routes. The "Manage assets" screen itself is retired --
 * assets are added from the Tokens tab pill, and hidden or removed from Asset
 * Details -- but these two routes still live under its path and are reached from
 * Home, so the router stays.
 *
 * The index redirects rather than 404s: the popup restores its last route on
 * reopen, so a popup left on /manage-assets would otherwise come back blank.
 */
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
    <Routes>
      <Route index element={<Navigate to={ROUTES.account} replace />}></Route>
      <Route path={searchAssetsPath} element={<SearchAsset />}></Route>
      <Route path={addAssetsPath} element={<AddAsset />}></Route>
    </Routes>
  );
};
