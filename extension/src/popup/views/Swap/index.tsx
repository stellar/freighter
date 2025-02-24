import React from "react";
import { Switch, Redirect } from "react-router-dom";

import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";

export const Swap = () => {
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
