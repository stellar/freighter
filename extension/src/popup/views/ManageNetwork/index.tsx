import React from "react";
import { Routes } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { NetworkForm } from "popup/components/manageNetwork/NetworkForm";
import { NetworkSettings } from "popup/components/manageNetwork/NetworkSettings";

export const ManageNetwork = () => (
  <Routes>
    <PublicKeyRoute path={ROUTES.addNetwork}>
      <NetworkForm isEditing={false} />
    </PublicKeyRoute>
    <PublicKeyRoute path={ROUTES.networkSettings}>
      <NetworkSettings />
    </PublicKeyRoute>
    <PublicKeyRoute path={ROUTES.editNetwork}>
      <NetworkForm isEditing />
    </PublicKeyRoute>
  </Routes>
);
