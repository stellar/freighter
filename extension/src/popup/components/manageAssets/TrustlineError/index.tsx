import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Asset, TransactionBuilder } from "stellar-sdk";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";

import { emitMetric } from "helpers/metrics";
import { getResultCodes, RESULT_CODES } from "popup/helpers/parseTransaction";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import "./styles.scss";

export enum TRUSTLINE_ERROR_STATES {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  NOT_ENOUGH_LUMENS = "NOT_ENOUGH_LUMENS",
  ASSET_HAS_BALANCE = "ASSET_HAS_BALANCE",
  ASSET_HAS_BUYING_LIABILITIES = "ASSET_HAS_BUYING_LIABILITIES",
}

interface MapErrorToErrorState {
  operations: string[];
  transaction: string;
}

const mapErrorToErrorState = (
  { operations = [] }: MapErrorToErrorState,
  buyingLiabilities: number,
) => {
  if (operations.includes(RESULT_CODES.op_invalid_limit)) {
    if (buyingLiabilities) {
      emitMetric(METRIC_NAMES.trustlineErrorBuyingLiability);
      return TRUSTLINE_ERROR_STATES.ASSET_HAS_BUYING_LIABILITIES;
    }

    emitMetric(METRIC_NAMES.trustlineErrorHasBalance);
    return TRUSTLINE_ERROR_STATES.ASSET_HAS_BALANCE;
  }

  if (operations.includes(RESULT_CODES.op_low_reserve)) {
    emitMetric(METRIC_NAMES.trustlineErrorLowReserve);
    return TRUSTLINE_ERROR_STATES.NOT_ENOUGH_LUMENS;
  }

  return TRUSTLINE_ERROR_STATES.UNKNOWN_ERROR;
};

interface RenderedErrorProps {
  errorState: TRUSTLINE_ERROR_STATES;
  assetBalance: string;
  resultCodes: string;
  buyingLiabilities: number;
}

const RenderedError = ({
  errorState,
  assetBalance,
  resultCodes,
  buyingLiabilities,
}: RenderedErrorProps) => {
  const { t } = useTranslation();

  switch (errorState) {
    case TRUSTLINE_ERROR_STATES.NOT_ENOUGH_LUMENS:
      return (
        <>
          <div className="TrustlineError__title">{t("Not enough lumens")}</div>
          <div className="TrustlineError__body">
            <p>0.500001 XLM {t("are required to add a new asset.")}</p>
            <p className="TrustlineError__links">
              <Link to="https://developers.stellar.org/docs/glossary/minimum-balance/#changes-to-transaction-fees-and-minimum-balances">
                {t("Learn more about transaction fees")}
              </Link>
              <br />
              <Link to="https://developers.stellar.org/docs/glossary/accounts/#liabilities">
                {t("Learn more about account reserves")}
              </Link>
            </p>
          </div>
        </>
      );
    case TRUSTLINE_ERROR_STATES.ASSET_HAS_BALANCE:
      return (
        <>
          <div className="TrustlineError__title">
            {t("This asset has a balance")}
          </div>
          <div
            className="TrustlineError__body"
            data-testid="TrustlineError__body"
          >
            {t("You still have a balance of")} {assetBalance}.{" "}
            {t("You must have a balance of")} 0{" "}
            {t("in order to remove an asset.")}
          </div>
        </>
      );
    case TRUSTLINE_ERROR_STATES.ASSET_HAS_BUYING_LIABILITIES:
      return (
        <>
          <div className="TrustlineError__title">
            {t("This asset has buying liabilities")}
          </div>
          <div
            className="TrustlineError__body"
            data-testid="TrustlineError__body"
          >
            {t("You still have a buying liability of")} {buyingLiabilities}.{" "}
            {t("You must have a buying liability of")} 0{" "}
            {t("in order to remove an asset.")}
          </div>
        </>
      );
    case TRUSTLINE_ERROR_STATES.UNKNOWN_ERROR:
    default:
      return (
        <>
          <div className="TrustlineError__title">
            {t("This transaction could not be completed.")}
          </div>
          <div className="TrustlineError__body">
            {t("Error code")}: {resultCodes}
          </div>
        </>
      );
  }
};

export const TrustlineError = ({
  handleClose,
  balances,
}: {
  handleClose?: () => void;
  balances: AccountBalances;
}) => {
  const { t } = useTranslation();
  const { error } = useSelector(transactionSubmissionSelector);
  const { networkPassphrase } = useSelector(settingsNetworkDetailsSelector);
  const [assetBalance, setAssetBalance] = useState("");
  const [buyingLiabilities, setBuyingLiabilities] = useState(0);

  const [isModalShowing, setIsModalShowing] = useState(true);

  useEffect(() => {
    emitMetric(METRIC_NAMES.manageAssetError, { error });
  }, [error]);

  useEffect(() => {
    // emit general metric on view load
    emitMetric(METRIC_NAMES.viewTrustlineError);
  });

  useEffect(() => {
    const xdrEnvelope = error?.response?.extras?.envelope_xdr;
    if (xdrEnvelope) {
      const parsedTx = TransactionBuilder.fromXDR(
        xdrEnvelope,
        networkPassphrase,
      );

      if ("operations" in parsedTx) {
        const op = parsedTx.operations[0];

        if ("line" in op) {
          const { code, issuer } = op.line as Asset;
          const asset = `${code}:${issuer}`;
          // TODO: get balance helper
          const balance = balances.balances?.find(
            (balance) => balance.contractId === asset,
          );

          if (!balance) {
            return;
          }

          setBuyingLiabilities(Number(balance.buyingLiabilities));

          setAssetBalance(
            `${new BigNumber(balance.available).toString()} ${
              balance?.token?.code
            }`,
          );
        }
      }
    }
  }, [balances, error, networkPassphrase]);

  const errorState: TRUSTLINE_ERROR_STATES = error
    ? mapErrorToErrorState(getResultCodes(error), buyingLiabilities)
    : TRUSTLINE_ERROR_STATES.UNKNOWN_ERROR;

  return isModalShowing
    ? createPortal(
        <div className="TrustlineError">
          <div
            className="TrustlineError__inset"
            data-testid="TrustlineError__error"
          >
            <RenderedError
              errorState={errorState}
              assetBalance={assetBalance}
              resultCodes={JSON.stringify(getResultCodes(error))}
              buyingLiabilities={buyingLiabilities}
            />
            <div>
              <Button
                size="md"
                isFullWidth
                variant="tertiary"
                onClick={() => {
                  setIsModalShowing(false);
                  if (handleClose) {
                    handleClose();
                  }
                }}
              >
                {t("Got it")}
              </Button>
            </div>
          </div>
        </div>,
        document.querySelector("#modal-root")!,
      )
    : null;
};
