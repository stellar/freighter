import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  ActionStatus,
  transactionSubmissionSelector,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

import { SubmitFail, SubmitSuccess } from "./SubmitResult";
import { TransactionDetails } from "./TransactionDetails";

import "../styles.scss";

export const SendConfirm = ({ previous }: { previous: ROUTES }) => {
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const [isSendComplete, setIsSendComplete] = useState(false);

  const render = () => {
    if (isSendComplete) {
      return (
        <TransactionDetails
          goBack={() => {
            dispatch(resetSubmission());
            navigateTo(ROUTES.accountHistory);
          }}
        />
      );
    }
    switch (submission.submitStatus) {
      case ActionStatus.IDLE:
        return <TransactionDetails goBack={() => navigateTo(previous)} />;
      case ActionStatus.PENDING:
        return <TransactionDetails goBack={() => navigateTo(previous)} />;
      case ActionStatus.SUCCESS:
        return <SubmitSuccess viewDetails={() => setIsSendComplete(true)} />;
      case ActionStatus.ERROR:
        return <SubmitFail />;
      default:
        return <TransactionDetails goBack={() => navigateTo(previous)} />;
    }
  };

  return <PopupWrapper>{render()}</PopupWrapper>;
};
