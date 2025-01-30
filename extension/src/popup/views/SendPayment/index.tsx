import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Routes, Navigate } from "react-router-dom";

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

  return (
    <Routes>
      <PublicKeyRoute path={ROUTES.sendPayment}>
        <Navigate to={ROUTES.sendPaymentTo} />
      </PublicKeyRoute>
      <PublicKeyRoute path={ROUTES.sendPaymentTo}>
        <SendTo previous={ROUTES.account} />
      </PublicKeyRoute>
      <PublicKeyRoute path={ROUTES.sendPaymentAmount}>
        <SendAmount
          previous={ROUTES.sendPaymentTo}
          next={ROUTES.sendPaymentSettings}
        />
      </PublicKeyRoute>
      <PublicKeyRoute path={ROUTES.sendPaymentType}>
        <SendType />
      </PublicKeyRoute>
      <PublicKeyRoute path={ROUTES.sendPaymentSettings}>
        <SendSettings
          previous={ROUTES.sendPaymentAmount}
          next={ROUTES.sendPaymentConfirm}
        />
      </PublicKeyRoute>
      <PublicKeyRoute path={ROUTES.sendPaymentSettingsFee}>
        <SendSettingsFee previous={ROUTES.sendPaymentSettings} />
      </PublicKeyRoute>
      <PublicKeyRoute path={ROUTES.sendPaymentSettingsSlippage}>
        <SendSettingsSlippage previous={ROUTES.sendPaymentSettings} />
      </PublicKeyRoute>
      <PublicKeyRoute path={ROUTES.sendPaymentSettingsTimeout}>
        <SendSettingsTxTimeout previous={ROUTES.sendPaymentSettings} />
      </PublicKeyRoute>
      <VerifiedAccountRoute path={ROUTES.sendPaymentConfirm}>
        <SendConfirm previous={ROUTES.sendPaymentSettings} />
      </VerifiedAccountRoute>
    </Routes>
  );
};
