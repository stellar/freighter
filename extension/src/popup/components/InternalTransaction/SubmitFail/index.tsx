import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import get from "lodash/get";
import { Button, Link, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ErrorMessage } from "@shared/api/types";

import { navigateTo } from "popup/helpers/navigate";
import { RESULT_CODES, getResultCodes } from "popup/helpers/parseTransaction";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { ROUTES } from "popup/constants/routes";
import {
  transactionSubmissionSelector,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import { View } from "popup/basics/layout/View";
import IconFail from "popup/assets/icon-fail.svg";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import "./styles.scss";

interface ErrorDetails {
  title: string;
  errorBlock: React.ReactNode;
  opError: RESULT_CODES;
  status: string;
}

export const SubmitFail = () => {
  const { error } = useSelector(transactionSubmissionSelector);
  const isSwap = useIsSwap();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    emitMetric(METRIC_NAMES.sendPaymentError, { error });
  }, [error]);

  const getErrorDetails = (err: ErrorMessage | undefined): ErrorDetails => {
    const errorDetails: ErrorDetails = {
      title: "",
      errorBlock: <div></div>,
      opError: RESULT_CODES.tx_failed,
      status: "",
    };

    const httpCode = get(err, "response.status", "");
    const { operations: opErrors, transaction: txError } = getResultCodes(err);

    if (opErrors[0]) {
      errorDetails.opError = opErrors[0] as RESULT_CODES;
    } else {
      errorDetails.opError = txError as RESULT_CODES;
    }

    switch (errorDetails.opError) {
      case RESULT_CODES.tx_insufficient_fee:
        errorDetails.title = t("Insufficient Fee");
        errorDetails.errorBlock = (
          <Notification variant="error" title={t("Network fees")}>
            <div>
              {t(
                "Fees can vary depending on the network congestion. Please try using the suggested fee and try again.",
              )}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/glossary/fees/"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about fees")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_underfunded:
        errorDetails.title = t("Insufficient Balance");
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t(
              "Your account balance is not sufficient for this transaction. Please review the transaction and try again.",
            )}
          />
        );
        break;
      case RESULT_CODES.op_no_destination:
        errorDetails.title = t("Destination account doesn't exist");
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t("The destination account doesn't exist")}
          >
            <div>
              {t("Make sure it is a funded Stellar account and try again.")}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about account funding")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_no_trust:
        errorDetails.title = t(
          "Destination account does not accept this asset",
        );
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t(
              "The destination account does not accept the asset you're sending",
            )}
          >
            <div>
              {t(
                "The destination account must opt to accept this asset before receiving it.",
              )}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/issuing-assets/anatomy-of-an-asset/#trustlines"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about trustlines")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_under_dest_min:
        errorDetails.title = t("Conversion rate changed");
        errorDetails.errorBlock = (
          <Notification variant="error" title={t("Conversion rate")}>
            <div>
              {t("Please check the new rate and try again.")}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/start/list-of-operations/#path-payment-strict-send"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about conversion rates")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_low_reserve:
        errorDetails.title = t("Account minimum balance is too low");
        errorDetails.errorBlock = (
          <Notification variant="error" title={t("New account")}>
            <div>
              {t(
                "To create a new account you need to send at least 1 XLM to it.",
              )}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/start/list-of-operations/#path-payment-strict-send"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about conversion rates")}
              </Link>
            </div>
          </Notification>
        );
        break;
      default:
        errorDetails.status = httpCode as string;
        errorDetails.title = `${
          isSwap ? t("Swap failed") : t("Transaction failed")
        }`;
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t("One or more operations in this transaction failed.")}
          />
        );
    }
    return errorDetails;
  };
  const errDetails = getErrorDetails(error);

  return (
    <React.Fragment>
      <View.AppHeader pageTitle={t("Error")} />
      <View.Content>
        <div className="SubmitResult__content">
          <div className="SubmitResult__amount">{errDetails.title}</div>
          <div className="SubmitResult__icon SubmitResult__fail">
            <img src={IconFail} alt={t("Icon Fail")} />
          </div>
          <div className="SubmitResult__error-code">
            {errDetails.status ? `Status ${errDetails.status}:` : ""}{" "}
            {errDetails.opError}
          </div>
        </div>
        <div className="SubmitResult__error-block">{errDetails.errorBlock}</div>
      </View.Content>
      <View.Footer>
        <Button
          isFullWidth
          variant="tertiary"
          size="md"
          onClick={() => {
            dispatch(resetSubmission());
            navigateTo(ROUTES.account, navigate);
          }}
        >
          {t("Got it")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
