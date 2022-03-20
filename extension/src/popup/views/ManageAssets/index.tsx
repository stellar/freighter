import React from "react";
import { Switch } from "react-router-dom";

import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { PreapprovedAssets } from "popup/components/manageAssets/PreapprovedAssets";

import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

export const ManageAssets = () => (
  <>
    <Switch>
      <PrivateKeyRoute exact path={ROUTES.manageAssets}>
        <PreapprovedAssets />
      </PrivateKeyRoute>
      <PrivateKeyRoute exact path={ROUTES.addAsset}>
        <AddAsset />
      </PrivateKeyRoute>
    </Switch>
  </>
);
