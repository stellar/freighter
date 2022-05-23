import React from "react";
import { useSelector } from "react-redux";

import {
  Switch,
  Redirect,
  Route,
  useLocation,
  RouteProps,
} from "react-router-dom";
import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { hasPrivateKeySelector } from "popup/ducks/accountServices";

export const VerifiedAccountRoute = (props: RouteProps) => {
  const location = useLocation();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  if (!hasPrivateKey) {
    return (
      <Redirect
        to={{
          pathname: ROUTES.verifyAccount,
          state: { from: location },
        }}
      />
    );
  }
  return <Route {...props} />;
};

export const SendPayment = () => (
  <Switch>
    <PublicKeyRoute exact path={ROUTES.sendPayment}>
      <Redirect to={ROUTES.sendPaymentTo} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentTo}>
      <SendTo previous={ROUTES.account} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentAmount}>
      <SendAmount previous={ROUTES.sendPaymentTo} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentType}>
      <SendType />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentSettings}>
      <SendSettings previous={ROUTES.sendPaymentAmount} />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentSettingsFee}>
      <SendSettingsFee />
    </PublicKeyRoute>
    <PublicKeyRoute exact path={ROUTES.sendPaymentSettingsSlippage}>
      <SendSettingsSlippage />
    </PublicKeyRoute>
    <VerifiedAccountRoute exact path={ROUTES.sendPaymentConfirm}>
      <SendConfirm previous={ROUTES.sendPaymentSettings} />
    </VerifiedAccountRoute>
  </Switch>
);
