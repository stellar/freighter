import React, { useState } from "react";
import { useSelector } from "react-redux";

import { Switch, Redirect } from "react-router-dom";
import { PrivateKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

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
  const [transactionFee, setTransactionFee] = useState(
    transactionData.transactionFee,
  );
  const [memo, setMemo] = useState(transactionData.memo);

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
          <SendAmount />
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
            transactionFee={transactionFee}
            memo={memo}
          />
        </PrivateKeyRoute>
      </Switch>
    </>
  );
};
