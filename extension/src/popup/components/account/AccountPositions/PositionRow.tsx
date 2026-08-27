import React from "react";
import { useTranslation } from "react-i18next";

import { AssetIcons } from "@shared/api/types";
import { BalanceRow } from "popup/components/BalanceRow";
import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";
import {
  formatAccountUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";

interface PositionRowProps {
  row: PositionTokenRow;
  assetIcons: AssetIcons;
  onClick: () => void;
}

/**
 * One supplied token, shown inside the My position sheet.
 *
 * Wraps BalanceRow rather than restating it, so icon resolution, the XLM
 * display name, code truncation and the click affordance all stay in one
 * place. The rate goes through `amountSlot`; the value alone goes through
 * `rightSlot` — the interest-gain figure that used to sit beside it here now
 * lives one level up, in the My position header, so showing it at both
 * levels would invite the reader to add the two together.
 */
export const PositionRow = ({ row, assetIcons, onClick }: PositionRowProps) => {
  const { t } = useTranslation();

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
            ? NO_FIAT_VALUE
            : t("{{rate}} APY", { rate: formatRate(row.apy) })}
        </span>
      }
      rightSlot={
        <div
          className="PositionRow__value"
          data-testid={`position-value-${row.code}`}
        >
          {formatAccountUsd(row.suppliedUsd)}
        </div>
      }
      onClick={onClick}
      data-testid={`position-row-${row.code}`}
    />
  );
};
