import React, { useState } from "react";
import { useSelector } from "react-redux";
import get from "lodash/get";

import { Switch, useLocation } from "react-router-dom";
import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import {
  SendAmount,
  SendTo,
  SendSettings,
  SendConfirm,
} from "popup/components/sendPayment";

import { publicKeySelector } from "popup/ducks/accountServices";

export const SendPayment = () => {
  // keep state separate for now, combine later if needed
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("native");
  const [destination, setDestination] = useState("");
  const [transactionFee, setTransactionFee] = useState("");
  const [memo, setMemo] = useState("");

  const location = useLocation();
  const accountBalances = JSON.parse(
    get(location, "state.accountBalances", "[]"),
  );
  const publicKey = useSelector(publicKeySelector);

  // TODO - enforce can't move to next route data not given
  return (
    <>
      <Switch>
        <PublicKeyRoute exact path={ROUTES.sendPayment}>
          <SendAmount
            amount={amount}
            setAmount={setAmount}
            asset={asset}
            setAsset={setAsset}
            accountBalances={accountBalances}
          />
        </PublicKeyRoute>
        <PublicKeyRoute exact path={ROUTES.sendPaymentTo}>
          <SendTo destination={destination} setDestination={setDestination} />
        </PublicKeyRoute>
        <PublicKeyRoute exact path={ROUTES.sendPaymentSettings}>
          <SendSettings
            transactionFee={transactionFee}
            setTransactionFee={setTransactionFee}
            memo={memo}
            setMemo={setMemo}
          />
        </PublicKeyRoute>
        <PublicKeyRoute exact path={ROUTES.sendPaymentConfirm}>
          <SendConfirm
            publicKey={publicKey}
            amount={amount}
            asset={asset}
            destination={destination}
            transactionFee={transactionFee}
            memo={memo}
          />
        </PublicKeyRoute>
      </Switch>
    </>
  );
};
