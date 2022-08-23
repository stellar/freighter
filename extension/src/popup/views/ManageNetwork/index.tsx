import React from "react";
import { Switch } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { NetworkForm } from "popup/components/manageNetwork/NetworkForm";

export const ManageNetwork = () => (
  <Switch>
    <PublicKeyRoute exact path={ROUTES.addNetwork}>
      <NetworkForm isEditing={false} />
    </PublicKeyRoute>
  </Switch>
);
