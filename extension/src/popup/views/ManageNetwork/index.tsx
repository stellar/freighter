import React from "react";
import { Route, Routes } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { NetworkForm } from "popup/components/manageNetwork/NetworkForm";
import { NetworkSettings } from "popup/components/manageNetwork/NetworkSettings";
import { getPathFromRoute } from "popup/helpers/route";

export const ManageNetwork = () => {
  const manageNetworkBasePath = "/manage-network/";
  const addNetworkPath = getPathFromRoute({
    fullRoute: ROUTES.addNetwork,
    basePath: manageNetworkBasePath,
  });
  const networkSettingsPath = getPathFromRoute({
    fullRoute: ROUTES.networkSettings,
    basePath: manageNetworkBasePath,
  });
  const editNetworkPath = getPathFromRoute({
    fullRoute: ROUTES.editNetwork,
    basePath: manageNetworkBasePath,
  });
  return (
    <Routes>
      <Route
        path={addNetworkPath}
        element={
          <PublicKeyRoute>
            <NetworkForm isEditing={false} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={networkSettingsPath}
        element={
          <PublicKeyRoute>
            <NetworkSettings />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={editNetworkPath}
        element={
          <PublicKeyRoute>
            <NetworkForm isEditing />
          </PublicKeyRoute>
        }
      ></Route>
    </Routes>
  );
};
