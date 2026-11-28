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
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { getPoolPositionSummary } from "popup/components/earn/helpers/poolPositionSummary";
import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";

import { PositionFigures, PositionTokenLine, Section } from "./PositionParts";
import { formatPositionGain, formatPositionTokens } from "./positionFigures";

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

          <PositionFigures
            totalUsd={summary.totalUsd}
            gain={gain}
            gainValue={summary.interestUsd}
            testIdPrefix="pool-position"
          />

          <Section title={t("Supplied tokens")}>
            {rows.map((row) => (
              <PositionTokenLine
                key={row.assetId}
                icon={
                  <AssetIcon
                    assetIcons={assetIcons}
                    code={row.code}
                    issuerKey={row.issuer}
                  />
                }
                code={row.code}
                subtitle={t("{{rate}} APY", { rate: formatRate(row.apy) })}
                subtitleTestId={`position-apy-${row.code}`}
                value={formatAccountUsd(row.suppliedUsd)}
                valueTestId={`position-value-${row.code}`}
                amount={formatPositionTokens(row.suppliedTokens, row.code)}
                onClick={() => onSelectToken(row)}
                testId={`position-row-${row.code}`}
              />
            ))}
          </Section>
        </div>
      </View.Content>
    </View>
  );
};
