import React from "react";

import { Switch, Redirect } from "react-router-dom";
import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";

// TODO - enforce can't move to next route data not given
export const SendPayment = () => (
  <Switch>
    {/* ALEC TODO - switch to private */}
    <PublicKeyRoute exact path={ROUTES.sendPayment}>
      <Redirect to={ROUTES.sendPaymentTo} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentTo}>
      <SendTo />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentAmount}>
      <SendAmount />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentSettings}>
      <SendSettings />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentSettingsFee}>
      <SendSettingsFee />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentConfirm}>
      <SendConfirm />
    </PublicKeyRoute>
  </Switch>
);
