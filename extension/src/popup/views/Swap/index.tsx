import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Switch, Redirect } from "react-router-dom";

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
    <Switch>
      <PublicKeyRoute exact path={ROUTES.swap}>
        <Redirect to={ROUTES.swapAmount} />
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.swapAmount}>
        <SendAmount previous={ROUTES.account} next={ROUTES.swapSettings} />
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.swapSettings}>
        <SendSettings previous={ROUTES.swapAmount} next={ROUTES.swapConfirm} />
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.swapSettingsFee}>
        <SendSettingsFee previous={ROUTES.swapSettings} />
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.swapSettingsSlippage}>
        <SendSettingsSlippage previous={ROUTES.swapSettings} />
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.swapSettingsTimeout}>
        <SendSettingsTxTimeout previous={ROUTES.swapSettings} />
      </PublicKeyRoute>
      <VerifiedAccountRoute exact path={ROUTES.swapConfirm}>
        <SendConfirm previous={ROUTES.swapSettings} />
      </VerifiedAccountRoute>
    </Switch>
  );
};
