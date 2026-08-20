import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { BlendCatalogPool } from "@shared/api/types/blend";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { getCatalogAssetIdentity } from "popup/components/earn/helpers/earnAssetIcons";
import { StatRow } from "popup/components/earn/StatRow";

import { usePoolReserveIcons } from "./hooks/usePoolReserveIcons";

import { getPoolDescription } from "./poolDescriptions";
import {
  formatCompactUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";

import "./styles.scss";

interface PoolDetailsSheetProps {
  pool: BlendCatalogPool;
  onClose: () => void;
}

/**
 * Pool description and market stats, opened from the pool card on the amount
 * screen.
 *
 * The Backstop row renders whatever the catalog reports, and "--" until a
 * backend serves `backstop_usd` — the v2 backend drops the field its own
 * upstream provides. Never a hardcoded figure, which would misrepresent the
 * pool's actual insurance.
 */
export const PoolDetailsSheet = ({ pool, onClose }: PoolDetailsSheetProps) => {
  const { t } = useTranslation();
  const description = getPoolDescription(pool.id);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const reserveIcons = usePoolReserveIcons(pool);

  return (
    <div className="PoolDetailsSheet" data-testid="earn-pool-details-sheet">
      <div className="PoolDetailsSheet__header">
        <PoolIcon />
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

      <div
        className="PoolDetailsSheet__body"
        data-testid="earn-pool-details-body"
      >
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
          <StatRow
            label={t("Accepted tokens")}
            value={
              <div className="PoolDetailsSheet__tokens">
                {pool.reserves.map((reserve) => {
                  // The catalog reports native XLM with no symbol and no name,
                  // so the identity has to be derived rather than read straight
                  // off the reserve — AssetIcon needs a code to recognise XLM
                  // and an issuer to look anything else up.
                  const { code, issuer } = getCatalogAssetIdentity({
                    symbol: reserve.symbol,
                    name: reserve.name,
                    assetId: reserve.assetId,
                    networkDetails,
                  });
                  return (
                    <AssetIcon
                      key={reserve.assetId}
                      assetIcons={reserveIcons}
                      code={code}
                      issuerKey={issuer}
                    />
                  );
                })}
              </div>
            }
          />
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
          <StatRow
            label={t("Backstop")}
            value={formatCompactUsd(pool.backstopUsd)}
            testId="earn-pool-backstop"
          />
        </div>
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
