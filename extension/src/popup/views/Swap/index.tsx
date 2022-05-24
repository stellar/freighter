import React from "react";
import { Switch, Redirect } from "react-router-dom";

import { VerifiedAccountRoute } from "popup/views/SendPayment";
import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";

export const Swap = () => (
  <Switch>
    <PublicKeyRoute exact path={ROUTES.swap}>
      <Redirect to={ROUTES.swapAmount} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.swapAmount}>
      <SendAmount previous={ROUTES.account} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.swapSettings}>
      <SendSettings previous={ROUTES.swapAmount} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.swapSettingsFee}>
      <SendSettingsFee />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.swapSettingsSlippage}>
      <SendSettingsSlippage />
    </PublicKeyRoute>
    <VerifiedAccountRoute exact path={ROUTES.swapConfirm}>
      <SendConfirm previous={ROUTES.swapSettings} />
    </VerifiedAccountRoute>
  </Switch>
);
