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
 * The index and the wildcard redirect rather than 404. The popup itself always
 * opens at "/" -- nothing in the extension persists or restores a route -- but a
 * fullscreen tab or a bookmark can be sitting on one of these hashes when the
 * extension updates and reloads its pages, including a child this release
 * retired such as the old /manage-assets/asset-visibility.
 *
 * The wildcard has to stay here rather than lean on the catch-all in `Router`:
 * react-router ranks `/manage-assets/*` above a bare `*`, so this component
 * claims every path under it and would render blank without an inner fallback.
 * `metrics/views.ts` keeps retired paths out of screen-view tracking.
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
      <Route
        path="*"
        element={<Navigate to={ROUTES.account} replace />}
      ></Route>
    </Routes>
  );
};
