import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { formatAmount } from "popup/helpers/formatters";
import { calculateSwapRate } from "../helpers/calculateSwapRate";

interface SwapRateRowProps {
  srcCode: string;
  dstCode: string;
  sendAmount: string;
  destinationAmount: string;
  destMin: string;
}

export const SwapRateRow = ({
  srcCode,
  dstCode,
  sendAmount,
  destinationAmount,
  destMin,
}: SwapRateRowProps) => {
  const { t } = useTranslation();
  const rate = calculateSwapRate({ sendAmount, destinationAmount });
  return (
    <>
      <div className="ReviewTx__Details__Row">
        <div className="ReviewTx__Details__Row__Title">
          <Icon.RefreshCw03 />
          {t("Rate")}
        </div>
        <div
          className="ReviewTx__Details__Row__Value"
          data-testid="review-tx-rate"
        >
          {`1 ${srcCode} ≈ ${rate} ${dstCode}`}
        </div>
      </div>
      <div className="ReviewTx__Details__Row">
        <div className="ReviewTx__Details__Row__Title">
          <Icon.ArrowDown />
          {t("Minimum received")}
        </div>
        <div
          className="ReviewTx__Details__Row__Value"
          data-testid="review-tx-minimum-received"
        >
          {`${formatAmount(destMin)} ${dstCode}`}
        </div>
      </div>
    </>
  );
};
