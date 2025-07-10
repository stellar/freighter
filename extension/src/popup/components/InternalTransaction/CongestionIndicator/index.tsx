import React from "react";
import classNames from "classnames";

import { NetworkCongestion } from "popup/helpers/useNetworkFees";

import "./styles.scss";

const congestionRank: Record<NetworkCongestion, number> = {
  [NetworkCongestion.LOW]: 1,
  [NetworkCongestion.MEDIUM]: 2,
  [NetworkCongestion.HIGH]: 3,
};

const shouldHaveColor = (
  level: NetworkCongestion,
  congestion: string,
): boolean => {
  const congestionEnumValue = Object.values(NetworkCongestion).find(
    (val) => val === congestion,
  ) as NetworkCongestion | undefined;

  if (!congestionEnumValue) return false;
  return congestionRank[congestionEnumValue] >= congestionRank[level];
};

interface CongestionIndicatorProps {
  congestion: string;
}

export const CongestionIndicator = ({
  congestion,
}: CongestionIndicatorProps) => {
  const levels = Object.values(NetworkCongestion);
  return (
    <div className="NetworkCongestionIndicator">
      {levels.map((level) => {
        const classes = classNames({
          NetworkCongestionIndicator__level: true,
          [`level-${level}`]: true,
          [`level-color-${shouldHaveColor(level, congestion) ? congestion : "Low"}`]:
            true,
        });
        return <div className={classes}></div>;
      })}
    </div>
  );
};
