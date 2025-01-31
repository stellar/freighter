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

  const sendToSlug = ROUTES.sendPaymentTo.split("/sendPayment/")[1];
  const sendAmountSlug = ROUTES.sendPaymentAmount.split("/sendPayment/")[1];
  const sendTypeSlug = ROUTES.sendPaymentType.split("/sendPayment/")[1];
  const sendSettingsSlug = ROUTES.sendPaymentSettings.split("/sendPayment/")[1];
  const settingsFeeSlug =
    ROUTES.sendPaymentSettingsFee.split("/sendPayment/")[1];
  const settingsSlippageSlug =
    ROUTES.sendPaymentSettingsSlippage.split("/sendPayment/")[1];
  const settingsTimeoutSlug =
    ROUTES.sendPaymentSettingsTimeout.split("/sendPayment/")[1];
  const settingsConfirmSlug =
    ROUTES.sendPaymentConfirm.split("/sendPayment/")[1];

  return (
    <Routes>
      <Route
        index
        element={
          <PublicKeyRoute>
            <Navigate to={sendToSlug} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={sendToSlug}
        element={
          <PublicKeyRoute>
            <SendTo previous={ROUTES.account} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={sendAmountSlug}
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
        path={sendTypeSlug}
        element={
          <PublicKeyRoute>
            <SendType />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={sendSettingsSlug}
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
        path={settingsFeeSlug}
        element={
          <PublicKeyRoute>
            <SendSettingsFee previous={ROUTES.sendPaymentSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={settingsSlippageSlug}
        element={
          <PublicKeyRoute>
            <SendSettingsSlippage previous={ROUTES.sendPaymentSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={settingsTimeoutSlug}
        element={
          <PublicKeyRoute>
            <SendSettingsTxTimeout previous={ROUTES.sendPaymentSettings} />
          </PublicKeyRoute>
        }
      ></Route>
      <Route
        path={settingsConfirmSlug}
        element={
          <VerifiedAccountRoute>
            <SendConfirm previous={ROUTES.sendPaymentSettings} />
          </VerifiedAccountRoute>
        }
      ></Route>
    </Routes>
  );
};
