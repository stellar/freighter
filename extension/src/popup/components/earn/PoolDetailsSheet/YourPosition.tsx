import React from "react";
import { Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { AssetIcons } from "@shared/api/types";
import { PoolPosition } from "@shared/api/types/blend";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { StatRow } from "popup/components/earn/StatRow";
import {
  formatAccountUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { formatProjection } from "popup/components/earn/EarnReview/helpers/projectEarnings";
import { NO_FIAT_VALUE, formatAmount } from "popup/helpers/formatters";
import {
  PositionAssetRow,
  getPositionSummary,
} from "popup/components/earn/helpers/positionSummary";

interface YourPositionProps {
  position: PoolPosition;
  /** Which supplied asset the sheet was opened from. */
  focusedAssetId?: string;
  assetIcons: AssetIcons;
}

const AssetLine = ({
  row,
  assetIcons,
  isGain,
}: {
  row: PositionAssetRow;
  assetIcons: AssetIcons;
  isGain: boolean;
}) => (
  <div className="PoolDetailsSheet__asset-line" key={row.assetId}>
    <AssetIcon assetIcons={assetIcons} code={row.code} issuerKey={row.issuer} />
    <Text as="div" size="sm" weight="medium">
      {row.code}
    </Text>
    <div className="PoolDetailsSheet__asset-line__figures">
      <div
        className={
          isGain
            ? "PoolDetailsSheet__asset-line__usd--gain"
            : "PoolDetailsSheet__asset-line__usd"
        }
        data-testid={`earn-position-${isGain ? "earnings" : "deposit"}-usd-${row.code}`}
      >
        {row.usd === null
          ? NO_FIAT_VALUE
          : `${isGain ? "+" : ""}${formatAccountUsd(row.usd)}`}
      </div>
      <div className="PoolDetailsSheet__asset-line__tokens">
        {`${formatAmount(row.tokens)} ${row.code}`}
      </div>
    </div>
  </div>
);

/**
 * The account's stake in this pool.
 *
 * Every figure comes from `getPositionSummary`, which owns the supply-vs-pool
 * scope decision — this component renders whatever it returns and never asks
 * which scope produced it. `deposits` and `earnings` are lists precisely so
 * pool scope needs no change here.
 */
export const YourPosition = ({
  position,
  focusedAssetId,
  assetIcons,
}: YourPositionProps) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const summary = getPositionSummary({
    position,
    focusedAssetId,
    networkDetails,
  });

  return (
    <div
      className="PoolDetailsSheet__position"
      data-testid="earn-position-panel"
    >
      <div className="PoolDetailsSheet__position__header">
        <div>
          <Text as="div" size="xs">
            {t("Current Balance")}
          </Text>
          <div
            className="PoolDetailsSheet__position__balance"
            data-testid="earn-position-balance"
          >
            {formatAccountUsd(summary.currentBalanceUsd)}
          </div>
        </div>
        <div className="PoolDetailsSheet__position__rate">
          {/* The frames read "Earn APR"; APY is what the backend returns. */}
          <Text as="div" size="xs">
            {t("Earn APY")}
          </Text>
          <div
            className="PoolDetailsSheet__position__apy"
            data-testid="earn-position-apy"
          >
            {formatRate(summary.apy)}
          </div>
        </div>
      </div>

      <Text as="div" size="xs">
        {t("Your deposits")}
      </Text>
      <div className="PoolDetailsSheet__group">
        {summary.deposits.map((row) => (
          <AssetLine
            key={row.assetId}
            row={row}
            assetIcons={assetIcons}
            isGain={false}
          />
        ))}
      </div>

      <Text as="div" size="xs">
        {t("Your earnings")}
      </Text>
      <div className="PoolDetailsSheet__group">
        {summary.earnings.map((row) => (
          <AssetLine
            key={row.assetId}
            row={row}
            assetIcons={assetIcons}
            isGain
          />
        ))}
        {/* One pair of rows for the whole panel, from the scoped balance and
            rate — not one pair per asset. */}
        <StatRow
          label={t("Est. monthly earnings")}
          value={formatProjection(summary.estMonthlyUsd)}
          testId="earn-position-est-monthly"
        />
        <StatRow
          label={t("Est. yearly earnings")}
          value={formatProjection(summary.estYearlyUsd)}
          testId="earn-position-est-yearly"
        />
      </div>
    </div>
  );
};
