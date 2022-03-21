import React, { useState } from "react";
import { useSelector } from "react-redux";

import {
  ActionStatus,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { publicKeySelector } from "popup/ducks/accountServices";

import { SubmitFail, SubmitPending, SubmitSuccess } from "./SubmitResult";
import { TransactionDetails } from "./TransactionDetails";

import "../styles.scss";

export const SendConfirm = () => {
  const submission = useSelector(transactionSubmissionSelector);
  const { transactionFee, memo } = submission.transactionData;
  const publicKey = useSelector(publicKeySelector);
  const [isSendComplete, setIsSendComplete] = useState(false);

  const render = () => {
    const transactionDetailsProps = {
      publicKey,
      transactionFee,
      memo,
      isSendComplete,
    };

    if (isSendComplete) {
      return <TransactionDetails {...transactionDetailsProps} />;
    }
    switch (submission.status) {
      case ActionStatus.IDLE:
        return <TransactionDetails {...transactionDetailsProps} />;
      case ActionStatus.PENDING:
        return <SubmitPending />;
      case ActionStatus.SUCCESS:
        return <SubmitSuccess viewDetails={() => setIsSendComplete(true)} />;
      case ActionStatus.ERROR:
        return <SubmitFail />;
      default:
        return <TransactionDetails {...transactionDetailsProps} />;
    }
  };

  return <PopupWrapper>{render()}</PopupWrapper>;
};
