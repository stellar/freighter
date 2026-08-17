import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { BlendCatalogPool } from "@shared/api/types/blend";
import { AssetIcon } from "popup/components/account/AccountAssets";

import { getPoolDescription } from "./poolDescriptions";
import { formatCompactUsd, formatRate } from "./helpers/formatPoolStats";

import "./styles.scss";

interface PoolDetailsSheetProps {
  pool: BlendCatalogPool;
  onClose: () => void;
}

const StatRow = ({
  label,
  value,
  isPositive = false,
  testId,
}: {
  label: string;
  value: string;
  isPositive?: boolean;
  testId: string;
}) => (
  <div className="PoolDetailsSheet__row">
    <Text as="div" size="sm">
      {label}
    </Text>
    <div
      className={`PoolDetailsSheet__row-value ${
        isPositive ? "PoolDetailsSheet__row-value--positive" : ""
      }`}
      data-testid={testId}
    >
      {value}
    </div>
  </div>
);

/**
 * Pool description and market stats, opened from the pool card on the amount
 * screen.
 *
 * No Backstop row: the backend's pool catalog does not expose `backstop_usd`,
 * and a stale hardcoded figure would misrepresent the pool's actual insurance.
 */
export const PoolDetailsSheet = ({ pool, onClose }: PoolDetailsSheetProps) => {
  const { t } = useTranslation();
  const description = getPoolDescription(pool.id);

  return (
    <div className="PoolDetailsSheet" data-testid="earn-pool-details-sheet">
      <div className="PoolDetailsSheet__header">
        <div className="PoolDetailsSheet__identity">
          <Text as="div" size="md" weight="semi-bold">
            {pool.name || t("Blend pool")}
          </Text>
          <Text as="div" size="sm">
            {t("by Blend")}
          </Text>
        </div>
        <button
          type="button"
          className="PoolDetailsSheet__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-pool-details-close"
        >
          <Icon.XClose />
        </button>
      </div>

      {description && (
        <div className="PoolDetailsSheet__description">
          <Text as="div" size="xs">
            {t("Description")}
          </Text>
          <Text as="p" size="sm">
            {description}
          </Text>
        </div>
      )}

      <Text as="div" size="xs">
        {t("Pool Details")}
      </Text>

      <div className="PoolDetailsSheet__group">
        <StatRow
          label={t("Lending Interest")}
          value={formatRate(pool.interestApy)}
          testId="earn-pool-interest-apy"
        />
        <StatRow
          label={t("Current Net APY")}
          value={formatRate(pool.netApy)}
          isPositive
          testId="earn-pool-net-apy"
        />
      </div>

      <div className="PoolDetailsSheet__group">
        <div className="PoolDetailsSheet__row">
          <Text as="div" size="sm">
            {t("Accepted tokens")}
          </Text>
          <div className="PoolDetailsSheet__tokens">
            {pool.reserves.map((reserve) => (
              <AssetIcon
                key={reserve.assetId}
                assetIcons={{}}
                code={reserve.symbol || ""}
              />
            ))}
          </div>
        </div>
        <StatRow
          label={t("Supplied")}
          value={formatCompactUsd(pool.suppliedUsd)}
          testId="earn-pool-supplied"
        />
        <StatRow
          label={t("Borrowed")}
          value={formatCompactUsd(pool.borrowedUsd)}
          testId="earn-pool-borrowed"
        />
      </div>

      <Button
        size="md"
        variant="tertiary"
        isFullWidth
        isRounded
        onClick={onClose}
      >
        {t("Close")}
      </Button>
    </div>
  );
};
