import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { RequestState, State } from "constants/request";
import { SimulateTxData } from "popup/components/send/SendAmount/hooks/useSimulateTxData";

import "./styles.scss";

export interface FeesPaneProps {
  fee: string;
  simulationState: State<SimulateTxData, string>;
  onClose: () => void;
}

export const FeesPane = ({ fee, simulationState, onClose }: FeesPaneProps) => {
  const { t } = useTranslation();

  const isLoading =
    simulationState.state === RequestState.IDLE ||
    simulationState.state === RequestState.LOADING;

  return (
    <div className="FeesPane" data-testid="review-tx-fees-pane">
      <div className="FeesPane__Header">
        <div className="FeesPane__Header__Icon">
          <Icon.Route />
        </div>
        <button
          type="button"
          className="FeesPane__Header__Close"
          data-testid="review-tx-fees-close-btn"
          onClick={onClose}
          aria-label={t("Close")}
        >
          <Icon.X />
        </button>
      </div>
      <div className="FeesPane__Title">
        <span>{t("Fees")}</span>
      </div>
      <div className="FeesPane__Card">
        {!isLoading && simulationState.data?.inclusionFee && (
          <div className="FeesPane__Card__Row">
            <span className="FeesPane__Card__Row__Label">
              {t("Inclusion Fee")}
            </span>
            <span
              className="FeesPane__Card__Row__Value"
              data-testid="review-tx-inclusion-fee"
            >
              {simulationState.data.inclusionFee} XLM
            </span>
          </div>
        )}
        {!isLoading && simulationState.data?.resourceFee && (
          <div className="FeesPane__Card__Row">
            <span className="FeesPane__Card__Row__Label">
              {t("Resource Fee")}
            </span>
            <span
              className="FeesPane__Card__Row__Value"
              data-testid="review-tx-resource-fee"
            >
              {simulationState.data.resourceFee} XLM
            </span>
          </div>
        )}
        <div className="FeesPane__Card__Row">
          <span className="FeesPane__Card__Row__Label FeesPane__Card__Row__Label--total">
            {t("Total Fee")}
          </span>
          <span
            className="FeesPane__Card__Row__Value FeesPane__Card__Row__Value--total"
            data-testid="review-tx-total-fee"
          >
            {isLoading ? t("Calculating...") : `${fee} XLM`}
          </span>
        </div>
      </div>
      <div
        className="FeesPane__Description"
        data-testid="review-tx-fees-description"
      >
        {simulationState.data?.resourceFee
          ? t("Fees description soroban")
          : t("Fees description classic")}
      </div>
    </div>
  );
};
