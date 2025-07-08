import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { ActionStatus } from "@shared/api/types";

import {
  transactionSubmissionSelector,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

import { SubmitFail, SubmitSuccess } from "./SubmitResult";
import { SendingTransaction, TransactionDetails } from "./TransactionDetails";

import "../styles.scss";

export const SendConfirm = ({ goBack }: { goBack: () => void }) => {
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const navigate = useNavigate();

  const [isSendComplete, setIsSendComplete] = useState(false);

  const render = () => {
    if (isSendComplete) {
      return (
        <TransactionDetails
          shouldScanTx={false}
          goBack={() => {
            dispatch(resetSubmission());
            navigateTo(ROUTES.accountHistory, navigate);
          }}
        />
      );
    }
    switch (submission.submitStatus) {
      case ActionStatus.IDLE:
        return <TransactionDetails shouldScanTx={true} goBack={goBack} />;
      case ActionStatus.PENDING:
        return <TransactionDetails shouldScanTx={false} goBack={goBack} />;
      case ActionStatus.SUCCESS:
        return <SubmitSuccess viewDetails={() => setIsSendComplete(true)} />;
      case ActionStatus.ERROR:
        return <SubmitFail />;
      default:
        return <TransactionDetails shouldScanTx={false} goBack={goBack} />;
    }
  };

  return render();
};

export const SendConfirm2 = ({ xdr }: { xdr: string }) => {
  const submission = useSelector(transactionSubmissionSelector);

  const render = () => {
    switch (submission.submitStatus) {
      case ActionStatus.IDLE:
      case ActionStatus.PENDING:
      case ActionStatus.SUCCESS:
        return <SendingTransaction xdr={xdr} />;
      case ActionStatus.ERROR:
        return <SubmitFail />;
      default:
        return <SendingTransaction xdr={xdr} />;
    }
  };

  return render();
};
