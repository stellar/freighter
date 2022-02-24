import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import { Switch } from "react-router-dom";
import { PublicKeyRoute } from "popup/Router";

import {
  SendAmount,
  SendTo,
  SendSettings,
  SendConfirm,
} from "popup/components/sendPayment";

import { getAccountBalances } from "@shared/api/internal";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";

// ALEC TODO - move somewhere else?
import { defaultAccountBalances } from "popup/views/Account";

// ALEC TODO - right name?
export const SendPayment = () => {
  // keep state separate for now, combine later if needed
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("XLM");
  const [destination, setDestination] = useState("");
  const [transactionFee, setTransactionFee] = useState("");
  const [memo, setMemo] = useState("");

  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [accountBalances, setAccountBalances] = useState(
    defaultAccountBalances,
  );

  // ALEC TODO - remove
  useEffect(() => {
    console.log("updated amount:", amount);
    console.log("updated asset:", asset);
  }, [amount, asset]);

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
            accountBalances={accountBalances}
          />
        </PublicKeyRoute>
        <PublicKeyRoute exact path="/sendPayment/to">
          <SendTo destination={destination} setDestination={setDestination} />
        </PublicKeyRoute>
        <PublicKeyRoute exact path="/sendPayment/settings">
          <SendSettings
            transactionFee={transactionFee}
            setTransactionFee={setTransactionFee}
            memo={memo}
            setMemo={setMemo}
          />
        </PublicKeyRoute>
        <PublicKeyRoute exact path="/sendPayment/confirm">
          <SendConfirm
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
