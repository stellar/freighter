import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Routes, Navigate, Route } from "react-router-dom";

import { AppDispatch } from "popup/App";
import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";

import {
  getAccountBalances,
  getAssetIcons,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getPathFromRoute } from "popup/helpers/route";

export const SendPayment = () => {
  const dispatch: AppDispatch = useDispatch<AppDispatch>();
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  // load needed send payment data here in case didn't go to home screen first
  useEffect(() => {
    (async () => {
      if (!accountBalances.balances) {
        const res = await dispatch(
          getAccountBalances({
            publicKey,
            networkDetails,
          })
        );

        if (getAccountBalances.fulfilled.match(res)) {
          dispatch(
            getAssetIcons({
              balances: res.payload.balances.balances,
              networkDetails,
            })
          );
        }
      }
    })();
  }, [dispatch, publicKey, networkDetails, accountBalances]);

  const sendPaymentBasePath = "/sendPayment/";
  const sendPaymentSettingsBasePath = "/sendPayment/settings/";
  const sendToPath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentTo,
    basePath: sendPaymentBasePath,
  });
  const sendAmountPath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentAmount,
    basePath: sendPaymentBasePath,
  });
  const sendTypePath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentType,
    basePath: sendPaymentBasePath,
  });
  const sendSettingsPath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentSettings,
    basePath: sendPaymentBasePath,
  });
  const settingsFeePath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentSettingsFee,
    basePath: sendPaymentSettingsBasePath,
  });
  const settingsSlippagePath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentSettingsSlippage,
    basePath: sendPaymentSettingsBasePath,
  });
  const settingsTimeoutPath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentSettingsTimeout,
    basePath: sendPaymentSettingsBasePath,
  });
  const settingsConfirmPath = getPathFromRoute({
    fullRoute: ROUTES.sendPaymentConfirm,
    basePath: sendPaymentBasePath,
  });

  return (
    <Routes>
      <Route
        index
        element={
          <PublicKeyRoute>
            <Navigate to={sendToPath} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={sendToPath}
        element={
          <PublicKeyRoute>
            <SendTo previous={ROUTES.account} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={sendAmountPath}
        element={
          <PublicKeyRoute>
            <SendAmount
              previous={ROUTES.sendPaymentTo}
              next={ROUTES.sendPaymentSettings}
            />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={sendTypePath}
        element={
          <PublicKeyRoute>
            <SendType />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={`${sendSettingsPath}/*`}
        element={
          <PublicKeyRoute>
            <Routes>
              <Route
                index
                element={
                  <PublicKeyRoute>
                    <SendSettings
                      previous={ROUTES.sendPaymentAmount}
                      next={ROUTES.sendPaymentConfirm}
                    />
                  </PublicKeyRoute>
                }
              ></Route>
              <Route
                path={settingsFeePath}
                element={
                  <PublicKeyRoute>
                    <SendSettingsFee previous={ROUTES.sendPaymentSettings} />
                  </PublicKeyRoute>
                }
              ></Route>
              <Route
                path={settingsSlippagePath}
                element={
                  <PublicKeyRoute>
                    <SendSettingsSlippage
                      previous={ROUTES.sendPaymentSettings}
                    />
                  </PublicKeyRoute>
                }
              ></Route>
              <Route
                path={settingsTimeoutPath}
                element={
                  <PublicKeyRoute>
                    <SendSettingsTxTimeout
                      previous={ROUTES.sendPaymentSettings}
                    />
                  </PublicKeyRoute>
                }
              ></Route>
            </Routes>
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={settingsConfirmPath}
        element={
          <VerifiedAccountRoute>
            <SendConfirm previous={ROUTES.sendPaymentSettings} />
          </VerifiedAccountRoute>
        }
      ></Route>
    </Routes>
  );
};
