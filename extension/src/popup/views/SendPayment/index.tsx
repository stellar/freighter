import React from "react";
import { useSelector } from "react-redux";

import {
  Switch,
  Redirect,
  Route,
  useLocation,
  RouteProps,
} from "react-router-dom";
import { PrivateKeyRoute, PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";

// ALEC TODO - possibly remove
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AppError } from "popup/components/AppError";
import {
  applicationStateSelector,
  hasPrivateKeySelector,
  authErrorSelector,
} from "popup/ducks/accountServices";

// ALEC TODO - change name
export const PrivateKeyRouteConfirm = (props: RouteProps) => {
  const location = useLocation();
  const applicationState = useSelector(applicationStateSelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const error = useSelector(authErrorSelector);

  // ALEC TODO - need to check these here?
  if (applicationState === APPLICATION_STATE.APPLICATION_ERROR) {
    return <AppError>{error}</AppError>;
  }
  if (applicationState === APPLICATION_STATE.APPLICATION_LOADING) {
    return null;
  }
  if (!hasPrivateKey) {
    return (
      <Redirect
        to={{
          pathname: ROUTES.verifyAccount,
          search: location.search,
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
    <PrivateKeyRoute exact path={ROUTES.sendPaymentConfirm}>
      <SendConfirm previous={ROUTES.sendPaymentSettings} />
    </PrivateKeyRoute>
  </Switch>
);
