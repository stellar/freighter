import React from "react";
import { useTranslation } from "react-i18next";

import { AssetIcons } from "@shared/api/types";
import { PoolPosition } from "@shared/api/types/blend";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import {
  formatAccountUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { getPoolPositionSummary } from "popup/components/earn/helpers/poolPositionSummary";
import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";

import { NO_FIAT_VALUE } from "popup/helpers/formatters";

import { formatPositionGain } from "./positionFigures";

interface PoolPositionScreenProps {
  position: PoolPosition;
  /** The tokens the account supplies to this pool. */
  rows: PositionTokenRow[];
  assetIcons: AssetIcons;
  onBack: () => void;
  onSelectToken: (row: PositionTokenRow) => void;
}

/**
 * Everything the account holds in one pool (Figma Varial 4875:104953): the
 * pool's total and its gain on principal, then one card per supplied token,
 * each opening that token's position screen.
 */
export const PoolPositionScreen = ({
  position,
  rows,
  assetIcons,
  onBack,
  onSelectToken,
}: PoolPositionScreenProps) => {
  const { t } = useTranslation();
  const summary = getPoolPositionSummary(position);
  const gain = formatPositionGain(summary.interestUsd, summary.gainPercent);

  return (
    <View>
      <SubviewHeader title={t("Position details")} customBackAction={onBack} />
      <View.Content hasNoTopPadding>
        <div className="PositionScreen" data-testid="pool-position-screen">
          <div className="PositionScreen__identity">
            <span className="PositionScreen__provider">
              <PoolIcon size={16} />
              {/* Blend's name, not copy: the same in every language. */}
              Blend
            </span>
            <span className="PositionScreen__pool-name">
              {formatPoolName(position.name, t)}
            </span>
          </div>

          <div className="PositionScreen__figures">
            <div
              className="PositionScreen__total"
              data-testid="pool-position-total"
            >
              {formatAccountUsd(summary.totalUsd)}
            </div>
            <div
              className={`PositionScreen__gain${
                gain ? "" : " PositionScreen__gain--unknown"
              }`}
              data-testid="pool-position-gain"
            >
              {gain ?? NO_FIAT_VALUE}
            </div>
          </div>

          <div className="PositionScreen__section">
            <div className="PositionScreen__section-title">
              {t("Supplied tokens")}
            </div>
            {rows.map((row) => (
              <button
                key={row.assetId}
                type="button"
                className="PositionScreen__card PositionScreen__token"
                onClick={() => onSelectToken(row)}
                data-testid={`position-row-${row.code}`}
              >
                <AssetIcon
                  assetIcons={assetIcons}
                  code={row.code}
                  issuerKey={row.issuer}
                />
                <span className="PositionScreen__token__name">
                  <span className="PositionScreen__primary">{row.code}</span>
                  <span
                    className="PositionScreen__positive-small"
                    data-testid={`position-apy-${row.code}`}
                  >
                    {t("{{rate}} APY", { rate: formatRate(row.apy) })}
                  </span>
                </span>
                <span className="PositionScreen__token__figures">
                  <span
                    className="PositionScreen__primary"
                    data-testid={`position-value-${row.code}`}
                  >
                    {formatAccountUsd(row.suppliedUsd)}
                  </span>
                  <span className="PositionScreen__secondary-small">
                    {`${formatEarnAmount(row.suppliedTokens)} ${row.code}`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </View.Content>
    </View>
  );
};
