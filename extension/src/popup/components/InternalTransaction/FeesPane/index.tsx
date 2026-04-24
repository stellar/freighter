import React from "react";
import { Icon, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { RequestState, type State } from "constants/request";
import { SimulateTxData } from "types/transactions";

import "./styles.scss";

export interface FeesPaneProps {
  fee: string;
  simulationState: State<SimulateTxData, string>;
  isSoroban?: boolean;
  onClose: () => void;
}

export const FeesPane = ({
  fee,
  simulationState,
  isSoroban = false,
  onClose,
}: FeesPaneProps) => {
  const { t } = useTranslation();

  const isError = simulationState.state === RequestState.ERROR;

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
        {isSoroban && (
          <div className="FeesPane__Card__Row">
            <span className="FeesPane__Card__Row__Label">
              {t("Inclusion Fee")}
            </span>
            <span
              className="FeesPane__Card__Row__Value"
              data-testid="review-tx-inclusion-fee"
            >
              {isError
                ? "—"
                : `${simulationState.data?.inclusionFee ?? fee} XLM`}
            </span>
          </div>
        )}
        {isSoroban && (
          <div className="FeesPane__Card__Row">
            <span className="FeesPane__Card__Row__Label">
              {t("Resource Fee")}
            </span>
            <span
              className="FeesPane__Card__Row__Value"
              data-testid="review-tx-resource-fee"
            >
              {isError
                ? "—"
                : simulationState.data?.resourceFee
                  ? `${simulationState.data.resourceFee} XLM`
                  : "-"}
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
            {isError ? "—" : `${fee} XLM`}
          </span>
        </div>
      </div>
      {isError && (
        <Notification
          variant="error"
          title={t("Failed to simulate transaction")}
        >
          {simulationState.error}
        </Notification>
      )}
      <div
        className="FeesPane__Description"
        data-testid="review-tx-fees-description"
      >
        {isSoroban
          ? t("Fees description soroban")
          : t("Fees description classic")}
      </div>
    </div>
  );
};
