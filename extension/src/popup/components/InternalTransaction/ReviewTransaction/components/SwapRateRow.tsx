import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { calculateSwapRate } from "../helpers/calculateSwapRate";
import { fitFontSizePx } from "popup/components/amount/fontScale";

interface SwapRateRowProps {
  srcCode: string;
  dstCode: string;
  sendAmount: string;
  destinationAmount: string;
}

// The rate value can be long ("1 yXLMUSD ≈ 0.00000012 yBTCETH") while the
// "Rate" label is short, so the row gives the label only the width it needs
// and lets the value fill the rest, stepping the value's font-size down by
// length so it isn't cropped.
const RATE_VALUE_FONT_SIZES = [
  { maxLen: 26, sizePx: 14 },
  { maxLen: 34, sizePx: 13 },
  { maxLen: 42, sizePx: 12 },
  { maxLen: Infinity, sizePx: 11 },
] as const;

export const getRateValueFontSizePx = (value: string): number =>
  fitFontSizePx(value, RATE_VALUE_FONT_SIZES);

export const SwapRateRow = ({
  srcCode,
  dstCode,
  sendAmount,
  destinationAmount,
}: SwapRateRowProps) => {
  const { t } = useTranslation();
  const rate = calculateSwapRate({ sendAmount, destinationAmount });
  const rateValue = `1 ${srcCode} ≈ ${rate} ${dstCode}`;
  return (
    <div className="ReviewTx__Details__Row ReviewTx__Details__Row--rate">
      <div className="ReviewTx__Details__Row__Title">
        <Icon.SwitchHorizontal01 />
        {t("Rate")}
      </div>
      <div
        className="ReviewTx__Details__Row__Value"
        data-testid="review-tx-rate"
        style={{ fontSize: `${getRateValueFontSizePx(rateValue)}px` }}
      >
        {rateValue}
      </div>
    </div>
  );
};
