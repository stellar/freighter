import React from "react";

import { Switch, Redirect } from "react-router-dom";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";

// TODO - enforce can't move to next route data not given
export const SendPayment = () => (
  <Switch>
    <PrivateKeyRoute exact path={ROUTES.sendPayment}>
      <Redirect to={ROUTES.sendPaymentTo} />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentTo}>
      <SendTo />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentAmount}>
      <SendAmount />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentSettings}>
      <SendSettings />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentSettingsFee}>
      <SendSettingsFee />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentConfirm}>
      <SendConfirm />
    </PrivateKeyRoute>
  </Switch>
);
