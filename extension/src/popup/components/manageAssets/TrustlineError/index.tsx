import React, { useEffect, useState } from "react";
import { useHistory, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";

import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
import {
  resetSubmission,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

import { emitMetric } from "helpers/metrics";
import { getResultCodes, RESULT_CODES } from "popup/helpers/parseTransaction";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { Balances } from "@shared/api/types";

import "./styles.scss";

export enum TRUSTLINE_ERROR_STATES {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  NOT_ENOUGH_LUMENS = "NOT_ENOUGH_LUMENS",
  ASSET_HAS_BALANCE = "ASSET_HAS_BALANCE",
}

interface MapErrorToErrorState {
  operations: string[];
  transaction: string;
}

const mapErrorToErrorState = ({ operations = [] }: MapErrorToErrorState) => {
  if (operations.includes(RESULT_CODES.op_invalid_limit)) {
    return TRUSTLINE_ERROR_STATES.ASSET_HAS_BALANCE;
  }

  if (operations.includes(RESULT_CODES.op_low_reserve)) {
    return TRUSTLINE_ERROR_STATES.NOT_ENOUGH_LUMENS;
  }

  return TRUSTLINE_ERROR_STATES.UNKNOWN_ERROR;
};

interface RenderedErrorProps {
  errorState: TRUSTLINE_ERROR_STATES;
  assetBalance: string;
  resultCodes: string;
}

const RenderedError = ({
  errorState,
  assetBalance,
  resultCodes,
}: RenderedErrorProps) => {
  const { t } = useTranslation();

  switch (errorState) {
    case TRUSTLINE_ERROR_STATES.NOT_ENOUGH_LUMENS:
      return (
        <InfoBlock variant={InfoBlock.variant.error}>
          <div>
            <p className="TrustlineError__title">{t("Not enough lumens")}</p>
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
        </InfoBlock>
      );
    case TRUSTLINE_ERROR_STATES.ASSET_HAS_BALANCE:
      return (
        <>
          <InfoBlock variant={InfoBlock.variant.warning}>
            <p className="TrustlineError__title">
              {t("This asset has a balance")}
            </p>
          </InfoBlock>
          <p className="TrustlineError__subtitle">
            {t("This asset has a balance of")} <strong>{assetBalance}</strong>.{" "}
            {t("You must have a balance of")} <strong>0</strong>{" "}
            {t("in order to remove an asset.")}
          </p>
        </>
      );
    case TRUSTLINE_ERROR_STATES.UNKNOWN_ERROR:
    default:
      return (
        <>
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
              <p className="TrustlineError__title">
                {t("This transaction could not be completed.")}
              </p>
              {resultCodes ? (
                <p className="TrustlineError__subtitle">
                  {t("Error code")}: {resultCodes}
                </p>
              ) : null}
            </div>
          </InfoBlock>
        </>
      );
  }
};

interface TrustlineErrorProps {
  balances: Balances;
  errorAsset: string;
}

export const TrustlineError = ({
  balances,
  errorAsset,
}: TrustlineErrorProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const { error } = useSelector(transactionSubmissionSelector);
  const [assetBalance, setAssetBalance] = useState("");

  useEffect(() => {
    emitMetric(METRIC_NAMES.manageAssetError, { error });
  }, [error]);

  useEffect(() => {
    if (!balances) return;
    const balance = balances[errorAsset];

    if (balance) {
      setAssetBalance(
        `${new BigNumber(balance.available).toString()} ${balance.token.code}`,
      );
    }
  }, [balances, errorAsset]);

  const errorState: TRUSTLINE_ERROR_STATES = error
    ? mapErrorToErrorState(getResultCodes(error))
    : TRUSTLINE_ERROR_STATES.UNKNOWN_ERROR;

  return (
    <div className="TrustlineError">
      <div className="TrustlineError__body">
        <RenderedError
          errorState={errorState}
          assetBalance={assetBalance}
          resultCodes={JSON.stringify(getResultCodes(error))}
        />
      </div>
      <div className="TrustlineError__button">
        <Button
          fullWidth
          onClick={() => {
            dispatch(resetSubmission());
            history.goBack();
          }}
        >
          {t("Got it")}
        </Button>
      </div>
    </div>
  );
};
