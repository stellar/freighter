import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Switch, Redirect } from "react-router-dom";

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

export const Swap = () => {
  const dispatch = useDispatch();
  const { accountBalances, assetIcons } = useSelector(
    transactionSubmissionSelector,
  );
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  // load needed swap data here in case didn't go to home screen first
  useEffect(() => {
    if (!accountBalances.balances) {
      dispatch(
        getAccountBalances({
          publicKey,
          networkDetails,
        }),
      );
    }
  }, [dispatch, publicKey, networkDetails, accountBalances]);

  useEffect(() => {
    if (!accountBalances.balances) return;
    if (!Object.keys(assetIcons).length) {
      dispatch(
        getAssetIcons({ balances: accountBalances.balances, networkDetails }),
      );
    }
  }, [dispatch, accountBalances, networkDetails, assetIcons]);

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
      <VerifiedAccountRoute exact path={ROUTES.swapConfirm}>
        <SendConfirm previous={ROUTES.swapSettings} />
      </VerifiedAccountRoute>
    </Switch>
  );
};
