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

import { formatGainBadge, getGainModifier } from "./positionFigures";

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
      className="PositionPoolCard"
      onClick={onClick}
      data-testid={`pool-card-${position.id}`}
    >
      <span className="PositionPoolCard__accent" aria-hidden="true" />
      <span className="PositionPoolCard__icon">
        <PoolIcon size={40} />
      </span>
      <span className="PositionPoolCard__body">
        <span className="PositionPoolCard__name">
          <span className="PositionPoolCard__pool">
            {formatPoolName(position.name, t)}
          </span>
          {/* Blend's name, not copy: the same in every language. */}
          <span className="PositionPoolCard__provider">· Blend</span>
        </span>
        <span className="PositionPoolCard__value">
          <span
            className="PositionPoolCard__total"
            data-testid={`pool-card-value-${position.id}`}
          >
            {formatAccountUsd(summary.totalUsd)}
          </span>
          {/* Unknown is "--", never zero or a silently missing badge. */}
          <span
            className={`PositionPoolCard__gain${getGainModifier(
              "PositionPoolCard__gain",
              summary.gainPercent,
            )}`}
            data-testid={`pool-card-gain-${position.id}`}
          >
            {gain ?? NO_FIAT_VALUE}
          </span>
        </span>
        <span
          className="PositionPoolCard__apy"
          data-testid={`pool-card-apy-${position.id}`}
        >
          {/* Unknown reads "-- Net APY", as the token rows read "-- APY". */}
          {t("{{rate}} Net APY", { rate: formatRate(summary.apy) })}
        </span>
      </span>
    </button>
  );
};
