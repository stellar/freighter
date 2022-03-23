import React from "react";
import { Switch } from "react-router-dom";

import { AddAsset } from "popup/components/manageAssets/AddAsset";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";

import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

export const ManageAssets = () => (
  <>
    <Switch>
      <PrivateKeyRoute exact path={ROUTES.manageAssets}>
        <ChooseAsset />
      </PrivateKeyRoute>
      <PrivateKeyRoute exact path={ROUTES.addAsset}>
        <AddAsset />
      </PrivateKeyRoute>
    </Switch>
  </>
);
