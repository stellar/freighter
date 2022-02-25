import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import { Switch } from "react-router-dom";
import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import {
  SendAmount,
  SendTo,
  SendSettings,
  SendConfirm,
} from "popup/components/sendPayment";

import { getAccountBalances } from "@shared/api/internal";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";

import { defaultAccountBalances } from "popup/views/Account";

export const SendPayment = () => {
  // keep state separate for now, combine later if needed
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("native");
  const [destination, setDestination] = useState("");
  const [transactionFee, setTransactionFee] = useState("");
  const [memo, setMemo] = useState("");

  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [accountBalances, setAccountBalances] = useState(
    defaultAccountBalances,
  );

  useEffect(() => {
    const fetchAccountBalances = async () => {
      try {
        const res = await getAccountBalances({
          publicKey,
          networkDetails,
        });
        setAccountBalances(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAccountBalances();
  }, [publicKey, networkDetails]);

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
