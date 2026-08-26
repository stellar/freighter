import React from "react";
import { useTranslation } from "react-i18next";

import { AssetIcons } from "@shared/api/types";
import { BalanceRow } from "popup/components/BalanceRow";
import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";
import { formatRate } from "popup/components/earn/helpers/formatPoolStats";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";

interface PositionRowProps {
  row: PositionTokenRow;
  assetIcons: AssetIcons;
  onClick: () => void;
}

/**
 * One supplied token on the Positions tab.
 *
 * Wraps BalanceRow rather than restating it, so icon resolution, the XLM
 * display name, code truncation and the click affordance all stay in one place.
 * Both of the row's coloured figures go through slots: the rate under the code
 * via `amountSlot`, the value and gain via `rightSlot`.
 */
export const PositionRow = ({ row, assetIcons, onClick }: PositionRowProps) => {
  const { t } = useTranslation();
  // True once a real interest figure exists, including a literal zero -- this
  // means "the value is known", not "there was a gain". Drives the +$X vs --
  // text only; color is the separate, stricter check below.
  const isGainKnown = row.interestEarnedUsd !== null;
  // Mirrors BalanceRow__delta's own rule: a flat zero is real but is not a
  // gain, so it stays neutral like the unavailable case — only a strictly
  // positive figure earns the green.
  const isPositiveGain =
    row.interestEarnedUsd !== null && row.interestEarnedUsd > 0;

  return (
    <BalanceRow
      code={row.code}
      issuerKey={row.issuer}
      assetIcons={assetIcons}
      amount=""
      amountSlot={
        <span
          className="PositionRow__apy"
          data-testid={`position-apy-${row.code}`}
        >
          {row.apy === null
            ? "--"
            : t("{{rate}} APY", { rate: formatRate(row.apy) })}
        </span>
      }
      rightSlot={
        <>
          <div
            className="PositionRow__value"
            data-testid={`position-value-${row.code}`}
          >
            {row.suppliedUsd === null
              ? "--"
              : `$${formatAmount(roundUsdValue(String(row.suppliedUsd)))}`}
          </div>
          <div
            className={`PositionRow__gain ${isPositiveGain ? "PositionRow__gain--positive" : ""}`}
            data-testid={`position-gain-${row.code}`}
          >
            {isGainKnown
              ? `+$${formatAmount(roundUsdValue(String(row.interestEarnedUsd)))}`
              : "--"}
          </div>
        </>
      }
      onClick={onClick}
      data-testid={`position-row-${row.code}`}
    />
  );
};
