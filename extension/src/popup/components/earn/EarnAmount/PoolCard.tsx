import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { formatRate } from "popup/components/earn/helpers/formatPoolStats";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { PoolIcon } from "popup/components/earn/PoolIcon";

interface PoolCardProps {
  poolName: string | null;
  /** The chosen asset's headline rate; null when there is no fresh price. */
  apy: number | null;
  onOpenDetails: () => void;
}

/**
 * The destination pool, with its current rate on a ribbon above the card.
 * Tapping it opens the pool details sheet.
 */
export const PoolCard = ({ poolName, apy, onOpenDetails }: PoolCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="PoolCard">
      <div className="PoolCard__ribbon" data-testid="earn-pool-apy">
        {t("Current APY: {{rate}}", { rate: formatRate(apy) })}
      </div>

      <button
        type="button"
        className="PoolCard__body"
        onClick={onOpenDetails}
        data-testid="earn-pool-card"
      >
        <PoolIcon size={40} />
        <div className="PoolCard__identity">
          <div className="PoolCard__name">{formatPoolName(poolName, t)}</div>
          <div className="PoolCard__provider">{t("by Blend")}</div>
        </div>
        <div className="PoolCard__chevron">
          <Icon.ChevronRight />
        </div>
      </button>
    </div>
  );
};
