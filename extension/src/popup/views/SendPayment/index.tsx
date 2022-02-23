import React, { useState } from "react";

// ALEC TODO - use PublicKeyRouter
import { Switch } from "react-router-dom";
import { PublicKeyRoute } from "popup/Router";

import {
  SendAmount,
  SendTo,
  SendSettings,
  SendConfirm,
} from "popup/components/sendPayment";

// ALEC TODO - right name?
export const SendPayment = () => {
  // keep state separate for now, combine later if needed
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("");
  // const destination = useState("");
  // const transactionFee = useState("");
  // const memo = useState("");

  return (
    <>
      <Switch>
        {/* ALEC TODO - move to constants, need "exact"? */}
        <PublicKeyRoute exact path="/sendPayment">
          <SendAmount
            amount={amount}
            setAmount={setAmount}
            asset={asset}
            setAsset={setAsset}
          />
        </PublicKeyRoute>
        <PublicKeyRoute exact path="/sendPayment/to">
          <SendTo />
        </PublicKeyRoute>
        <PublicKeyRoute exact path="/sendPayment/settings">
          <SendSettings />
        </PublicKeyRoute>
        <PublicKeyRoute exact path="/sendPayment/confirm">
          <SendConfirm />
        </PublicKeyRoute>
      </Switch>
    </>
  );
};
