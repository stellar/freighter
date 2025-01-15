import React from "react";
import { Route, Switch } from "react-router-dom";

import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { AssetVisibility } from "popup/components/manageAssets/AssetVisibility";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

export const ManageAssets = () => (
  <>
    <Switch>
      <PrivateKeyRoute exact path={ROUTES.manageAssets}>
        <ChooseAsset />
      </PrivateKeyRoute>
      <PrivateKeyRoute exact path={ROUTES.searchAsset}>
        <SearchAsset />
      </PrivateKeyRoute>
      <PrivateKeyRoute exact path={ROUTES.assetVisibility}>
        <AssetVisibility />
      </PrivateKeyRoute>
      <Route exact path={ROUTES.addAsset}>
        <AddAsset />
      </Route>
    </Switch>
  </>
);
