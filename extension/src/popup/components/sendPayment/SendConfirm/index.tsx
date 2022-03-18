import React, { useState } from "react";
import { useSelector } from "react-redux";

import {
  ActionStatus,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { SubmitFail, SubmitSuccess } from "./SubmitResult";
import { TransactionDetails } from "./TransactionDetails";

import "../styles.scss";

export const SendConfirm = () => {
  const submission = useSelector(transactionSubmissionSelector);
  const [isSendComplete, setIsSendComplete] = useState(false);

  const render = () => {
    if (isSendComplete) {
      return <TransactionDetails isSendComplete />;
    }
    switch (submission.status) {
      case ActionStatus.IDLE:
        return <TransactionDetails />;
      case ActionStatus.PENDING:
        // ALEC TODO - load submission status, and if pending then do overlay
        return <TransactionDetails />;
      case ActionStatus.SUCCESS:
        return <SubmitSuccess viewDetails={() => setIsSendComplete(true)} />;
      case ActionStatus.ERROR:
        return <SubmitFail />;
      default:
        return <TransactionDetails />;
    }
  };

  return <PopupWrapper>{render()}</PopupWrapper>;
};
