import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Routes, Navigate, Route } from "react-router-dom";

import { AppDispatch } from "popup/App";
import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import {
  getAccountBalances,
  getAssetIcons,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";

export const Swap = () => {
  const dispatch: AppDispatch = useDispatch();
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  // load needed swap data here in case didn't go to home screen first
  useEffect(() => {
    (async () => {
      if (!accountBalances.balances) {
        const res = await dispatch(
          getAccountBalances({
            publicKey,
            networkDetails,
          }),
        );

        if (getAccountBalances.fulfilled.match(res)) {
          dispatch(
            getAssetIcons({
              balances: res.payload.balances,
              networkDetails,
            }),
          );
        }
      }
    })();
  }, [dispatch, publicKey, networkDetails, accountBalances]);

  return (
    <Routes>
      <Route
        path={ROUTES.swap}
        element={
          <PublicKeyRoute>
            <Navigate to={ROUTES.swapAmount} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={ROUTES.swapAmount}
        element={
          <PublicKeyRoute>
            <SendAmount previous={ROUTES.account} next={ROUTES.swapSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={ROUTES.swapSettings}
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
        path={ROUTES.swapSettingsFee}
        element={
          <PublicKeyRoute>
            <SendSettingsFee previous={ROUTES.swapSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={ROUTES.swapSettingsSlippage}
        element={
          <PublicKeyRoute>
            <SendSettingsSlippage previous={ROUTES.swapSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={ROUTES.swapSettingsTimeout}
        element={
          <PublicKeyRoute>
            <SendSettingsTxTimeout previous={ROUTES.swapSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={ROUTES.swapConfirm}
        element={
          <VerifiedAccountRoute>
            <SendConfirm previous={ROUTES.swapSettings} />
          </VerifiedAccountRoute>
        }
      ></Route>
    </Routes>
  );
};
