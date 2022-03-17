import React, { useState } from "react";
import { useSelector } from "react-redux";

import {
  ActionStatus,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { SubmitFail, SubmitPending, SubmitSuccess } from "./SubmitResult";
import { TransactionDetails } from "./TransactionDetails";

import "../styles.scss";

export const SendConfirm = ({
  publicKey,
  transactionFee,
  memo,
}: {
  publicKey: string;
  transactionFee: string;
  memo: string;
}) => {
  const submission = useSelector(transactionSubmissionSelector);
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
