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
import { TransactionDetails } from "./TransactionDetails";

import "../styles.scss";

export const SendConfirm = ({ previous }: { previous: ROUTES }) => {
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
        return (
          <TransactionDetails
            shouldScanTx={true}
            goBack={() => navigateTo(previous, navigate)}
          />
        );
      case ActionStatus.PENDING:
        return (
          <TransactionDetails
            shouldScanTx={false}
            goBack={() => navigateTo(previous, navigate)}
          />
        );
      case ActionStatus.SUCCESS:
        return <SubmitSuccess viewDetails={() => setIsSendComplete(true)} />;
      case ActionStatus.ERROR:
        return <SubmitFail />;
      default:
        return (
          <TransactionDetails
            shouldScanTx={false}
            goBack={() => navigateTo(previous, navigate)}
          />
        );
    }
  };

  return render();
};
