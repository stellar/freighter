import React from "react";
import { Route, Routes } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { NetworkForm } from "popup/components/manageNetwork/NetworkForm";
import { NetworkSettings } from "popup/components/manageNetwork/NetworkSettings";

export const ManageNetwork = () => {
  const addNetworkSlug = ROUTES.addNetwork.split("/manage-network/")[1];
  const networkSettingsSlug =
    ROUTES.networkSettings.split("/manage-network/")[1];
  const editNetworkSlug = ROUTES.editNetwork.split("/manage-network/")[1];
  return (
    <Routes>
      <Route
        path={addNetworkSlug}
        element={
          <PublicKeyRoute>
            <NetworkForm isEditing={false} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={networkSettingsSlug}
        element={
          <PublicKeyRoute>
            <NetworkSettings />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={editNetworkSlug}
        element={
          <PublicKeyRoute>
            <NetworkForm isEditing />
          </PublicKeyRoute>
        }
      ></Route>
    </Routes>
  );
};
