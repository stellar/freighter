import React from "react";
import { Routes, Route } from "react-router-dom";

import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";
import { getPathFromRoute } from "popup/helpers/route";

export const Swap = () => {
  const swapBasePath = "/swap/";
  const swapSettingsBasePath = "/swap/settings/";
  const amountPath = getPathFromRoute({
    fullRoute: ROUTES.swapAmount,
    basePath: swapBasePath,
  });
  const settingsPath = getPathFromRoute({
    fullRoute: ROUTES.swapSettings,
    basePath: swapBasePath,
  });
  const settingsFeePath = getPathFromRoute({
    fullRoute: ROUTES.swapSettingsFee,
    basePath: swapSettingsBasePath,
  });
  const settingsSlippagePath = getPathFromRoute({
    fullRoute: ROUTES.swapSettingsSlippage,
    basePath: swapSettingsBasePath,
  });
  const settingsTimeoutPath = getPathFromRoute({
    fullRoute: ROUTES.swapSettingsTimeout,
    basePath: swapSettingsBasePath,
  });
  const swapConfirmPath = getPathFromRoute({
    fullRoute: ROUTES.swapConfirm,
    basePath: swapBasePath,
  });

  return (
    <Routes>
      <Route
        index
        element={
          <PublicKeyRoute>
            <SendAmount previous={ROUTES.account} next={ROUTES.swapSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={amountPath}
        element={
          <PublicKeyRoute>
            <SendAmount previous={ROUTES.account} next={ROUTES.swapSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={`${settingsPath}/*`}
        element={
          <PublicKeyRoute>
            <Routes>
              <Route
                index
                element={
                  <PublicKeyRoute>
                    <SendSettings
                      previous={ROUTES.swapAmount}
                      next={ROUTES.swapConfirm}
                    />
                  </PublicKeyRoute>
                }
              ></Route>
              <Route
                path={settingsFeePath}
                element={
                  <PublicKeyRoute>
                    <SendSettingsFee previous={ROUTES.swapSettings} />
                  </PublicKeyRoute>
                }
              ></Route>
              <Route
                path={settingsSlippagePath}
                element={
                  <PublicKeyRoute>
                    <SendSettingsSlippage previous={ROUTES.swapSettings} />
                  </PublicKeyRoute>
                }
              ></Route>
              <Route
                path={settingsTimeoutPath}
                element={
                  <PublicKeyRoute>
                    <SendSettingsTxTimeout previous={ROUTES.swapSettings} />
                  </PublicKeyRoute>
                }
              ></Route>
            </Routes>
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={swapConfirmPath}
        element={
          <VerifiedAccountRoute>
            <SendConfirm previous={ROUTES.swapSettings} />
          </VerifiedAccountRoute>
        }
      ></Route>
    </Routes>
  );
};
