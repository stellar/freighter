import React from "react";
import { Route, Routes } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { NetworkForm } from "popup/components/manageNetwork/NetworkForm";
import { NetworkSettings } from "popup/components/manageNetwork/NetworkSettings";

export const ManageNetwork = () => (
  <Routes>
    <Route
      path={ROUTES.addNetwork}
      element={
        <PublicKeyRoute>
          <NetworkForm isEditing={false} />
        </PublicKeyRoute>
      }
    ></Route>
    <Route
      path={ROUTES.networkSettings}
      element={
        <PublicKeyRoute>
          <NetworkSettings />
        </PublicKeyRoute>
      }
    ></Route>
    <Route
      path={ROUTES.editNetwork}
      element={
        <PublicKeyRoute>
          <NetworkForm isEditing />
        </PublicKeyRoute>
      }
    ></Route>
  </Routes>
);
