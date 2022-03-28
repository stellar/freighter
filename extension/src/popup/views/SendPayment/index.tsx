import React from "react";

import { Switch, Redirect } from "react-router-dom";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";

export const SendPayment = () => (
  <Switch>
    <PrivateKeyRoute exact path={ROUTES.sendPayment}>
      <Redirect to={ROUTES.sendPaymentTo} />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentTo}>
      <SendTo previous={ROUTES.account} />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentAmount}>
      <SendAmount previous={ROUTES.sendPaymentTo} />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentType}>
      <SendType />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentSettings}>
      <SendSettings previous={ROUTES.sendPaymentAmount} />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentSettingsFee}>
      <SendSettingsFee />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentSettingsSlippage}>
      <SendSettingsSlippage />
    </PrivateKeyRoute>
    <PrivateKeyRoute exact path={ROUTES.sendPaymentConfirm}>
      <SendConfirm previous={ROUTES.sendPaymentSettings} />
    </PrivateKeyRoute>
  </Switch>
);
