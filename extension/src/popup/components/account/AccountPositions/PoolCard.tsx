import React from "react";
import { useTranslation } from "react-i18next";

import { PoolPosition } from "@shared/api/types/blend";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import {
  formatAccountUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { getPoolPositionSummary } from "popup/components/earn/helpers/poolPositionSummary";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";

import { formatGainBadge } from "./positionFigures";

interface PoolCardProps {
  position: PoolPosition;
  onClick: () => void;
}

/**
 * One pool the account supplies to, on the Positions tab (Figma Varial
 * 4470:111628): the pool and its provider, what the account holds there, its
 * gain on principal, and the pool's net APY.
 */
export const PoolCard = ({ position, onClick }: PoolCardProps) => {
  const { t } = useTranslation();
  const summary = getPoolPositionSummary(position);
  const gain = formatGainBadge(summary.gainPercent);

  return (
    <button
      type="button"
      className="PoolCard"
      onClick={onClick}
      data-testid={`pool-card-${position.id}`}
    >
      <span className="PoolCard__accent" aria-hidden="true" />
      <span className="PoolCard__icon">
        <PoolIcon size={40} />
      </span>
      <span className="PoolCard__body">
        <span className="PoolCard__name">
          <span className="PoolCard__pool">
            {formatPoolName(position.name, t)}
          </span>
          {/* Blend's name, not copy: the same in every language. */}
          <span className="PoolCard__provider">· Blend</span>
        </span>
        <span className="PoolCard__value">
          <span
            className="PoolCard__total"
            data-testid={`pool-card-value-${position.id}`}
          >
            {formatAccountUsd(summary.totalUsd)}
          </span>
          {/* Unknown is "--", never zero or a silently missing badge. */}
          <span
            className={`PoolCard__gain${gain ? "" : " PoolCard__gain--unknown"}`}
            data-testid={`pool-card-gain-${position.id}`}
          >
            {gain ?? NO_FIAT_VALUE}
          </span>
        </span>
        <span
          className="PoolCard__apy"
          data-testid={`pool-card-apy-${position.id}`}
        >
          {summary.apy === null
            ? NO_FIAT_VALUE
            : t("{{rate}} Net APY", { rate: formatRate(summary.apy) })}
        </span>
      </span>
    </button>
  );
};
