import React from "react";
import { Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { PoolPosition } from "@shared/api/types/blend";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import {
  formatAccountUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { getPoolPositionSummary } from "popup/components/earn/helpers/poolPositionSummary";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";

interface PoolCardProps {
  position: PoolPosition;
  onClick: () => void;
}

/**
 * One pool on the Positions tab.
 *
 * Pool-shaped rather than token-shaped: the multi-pool design lists pools, so a
 * second pool is one more entry in the caller's map rather than a re-layout.
 * The supplied tokens live one level down, inside My position.
 */
export const PoolCard = ({ position, onClick }: PoolCardProps) => {
  const { t } = useTranslation();
  const summary = getPoolPositionSummary(position);

  return (
    <button
      type="button"
      className="PositionsPoolCard"
      onClick={onClick}
      data-testid={`pool-card-${position.id}`}
    >
      <PoolIcon />
      <div className="PositionsPoolCard__body">
        <Text as="div" size="sm" addlClassName="PositionsPoolCard__identity">
          {position.name || t("Blend pool")}
          <span className="PositionsPoolCard__protocol">{` · ${t("Blend")}`}</span>
        </Text>
        <div className="PositionsPoolCard__figures">
          <span
            className="PositionsPoolCard__value"
            data-testid={`pool-card-value-${position.id}`}
          >
            {formatAccountUsd(summary.totalUsd)}
          </span>
          <span
            className="PositionsPoolCard__gain"
            data-testid={`pool-card-gain-${position.id}`}
          >
            {summary.gainPercent === null
              ? NO_FIAT_VALUE
              : `+${formatRate(summary.gainPercent)}`}
          </span>
        </div>
        <div
          className="PositionsPoolCard__apy"
          data-testid={`pool-card-apy-${position.id}`}
        >
          {summary.apy === null
            ? NO_FIAT_VALUE
            : t("{{rate}} APY", { rate: formatRate(summary.apy) })}
        </div>
      </div>
    </button>
  );
};
