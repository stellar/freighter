import React, { useState } from "react";
import { useSelector } from "react-redux";
import get from "lodash/get";

import { Switch, useLocation, Redirect } from "react-router-dom";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { BottomNav } from "popup/components/BottomNav";

import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";

import { publicKeySelector } from "popup/ducks/accountServices";
import { transactionDataSelector } from "popup/ducks/transactionSubmission";

export const SendPayment = () => {
  const transactionData = useSelector(transactionDataSelector);

  // TODO - load from redux in the child components
  const [amount, setAmount] = useState(transactionData.amount);
  const [asset, setAsset] = useState(transactionData.asset);
  const [destination] = useState(transactionData.destination);
  const [transactionFee, setTransactionFee] = useState(
    transactionData.transactionFee,
  );
  const [memo, setMemo] = useState(transactionData.memo);

  const location = useLocation();
  const [accountBalances] = useState(
    JSON.parse(get(location, "state.accountBalances", "[]")),
  );

  const publicKey = useSelector(publicKeySelector);

  // TODO - enforce can't move to next route data not given
  return (
    <>
      <Switch>
        <PrivateKeyRoute exact path={ROUTES.sendPayment}>
          <Redirect to={ROUTES.sendPaymentTo} />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.sendPaymentTo}>
          <SendTo />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.sendPaymentAmount}>
          <SendAmount
            amount={amount}
            setAmount={setAmount}
            asset={asset}
            setAsset={setAsset}
            accountBalances={accountBalances}
          />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.sendPaymentSettings}>
          <SendSettings
            transactionFee={transactionFee}
            memo={memo}
            setMemo={setMemo}
          />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.sendPaymentSettingsFee}>
          <SendSettingsFee
            transactionFee={transactionFee}
            setTransactionFee={setTransactionFee}
          />
        </PrivateKeyRoute>
        <PrivateKeyRoute exact path={ROUTES.sendPaymentConfirm}>
          <SendConfirm
            publicKey={publicKey}
            amount={amount}
            asset={asset}
            destination={destination}
            transactionFee={transactionFee}
            memo={memo}
          />
        </PrivateKeyRoute>
      </Switch>
      <BottomNav />
    </>
  );
};
