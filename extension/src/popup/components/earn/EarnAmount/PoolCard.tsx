import React from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { formatRate } from "popup/components/earn/PoolDetailsSheet/helpers/formatPoolStats";

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
        <Text as="div" size="xs" weight="medium">
          {/* The asterisk ties to the APY disclaimer shown on the token picker. */}
          {t("Current APY: {{rate}}*", { rate: formatRate(apy) })}
        </Text>
      </div>

      <button
        type="button"
        className="PoolCard__body"
        onClick={onOpenDetails}
        data-testid="earn-pool-card"
      >
        <div className="PoolCard__identity">
          <Text as="div" size="sm" weight="medium">
            {poolName || t("Blend pool")}
          </Text>
          <Text as="div" size="xs">
            {t("by Blend")}
          </Text>
        </div>
        <div className="PoolCard__chevron">
          <Icon.ChevronRight />
        </div>
      </button>
    </div>
  );
};
