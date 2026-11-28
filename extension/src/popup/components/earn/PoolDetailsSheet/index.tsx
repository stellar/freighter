import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { BlendCatalogPool } from "@shared/api/types/blend";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { getBlendAppUrl } from "popup/constants/externalLinks";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { openTab } from "popup/helpers/navigate";
import { StatRow } from "popup/components/earn/StatRow";
import { SheetHeader, SheetHeaderLayout } from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import {
  formatCompactUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";

import "./styles.scss";

interface PoolDetailsSheetProps {
  pool: BlendCatalogPool;
  /** The token being deposited: badges the pool icon and sets the rate shown. */
  token: {
    code: string;
    issuer?: string;
    icon?: string | null;
    /** Its headline rate in this pool; null when there is no fresh price. */
    apy: number | null;
  };
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
 *
 * The description is one string for every pool rather than a per-pool lookup:
 * it describes what supplying to a Blend pool does, and makes no claim about a
 * specific deployment. "View pool details" carries the pool-specific detail out
 * to Blend's docs instead.
 */
export const PoolDetailsSheet = ({
  pool,
  token,
  onClose,
}: PoolDetailsSheetProps) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  return (
    <SheetLayout
      data-testid="earn-pool-details-sheet"
      header={
        <SheetHeader
          layout={SheetHeaderLayout.Inline}
          leading={
            <div className="PoolDetailsSheet__mark">
              <PoolIcon size={40} />
              {/* The token being deposited, badged onto the pool. */}
              <div className="PoolDetailsSheet__token">
                <AssetIcon
                  assetIcons={token.icon ? { [token.code]: token.icon } : {}}
                  code={token.code}
                  issuerKey={token.issuer}
                  icon={token.icon || undefined}
                />
              </div>
            </div>
          }
          title={formatPoolName(pool.name, t)}
          subtitle={t("by Blend")}
          onClose={onClose}
          closeTestId="earn-pool-details-close"
        />
      }
    >
      <div
        className="PoolDetailsSheet__body"
        data-testid="earn-pool-details-body"
      >
        <div className="PoolDetailsSheet__block">
          <div className="PoolDetailsSheet__section-title">
            {t("Description")}
          </div>
          <div className="PoolDetailsSheet__description">
            {t(
              "Deposit supported tokens into this Blend pool to earn yield. APY may change over time. Withdraw anytime.",
            )}
          </div>
          <button
            type="button"
            className="PoolDetailsSheet__app-link"
            onClick={() => openTab(getBlendAppUrl(networkDetails.network))}
            data-testid="earn-pool-app-link"
          >
            {t("View pool details")}
            <Icon.LinkExternal01 />
          </button>
        </div>

        <div className="PoolDetailsSheet__block">
          <div className="PoolDetailsSheet__section-title">
            {t("Current yield")}
          </div>
          <div className="PoolDetailsSheet__group">
            <StatRow
              label={t("Deposit APY")}
              value={formatRate(token.apy)}
              isPositive
              testId="earn-pool-deposit-apy"
            />
          </div>
        </div>

        <div className="PoolDetailsSheet__block">
          <div className="PoolDetailsSheet__section-title">
            {t("Pool liquidity")}
          </div>
          <div className="PoolDetailsSheet__group">
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
      </div>
    </SheetLayout>
  );
};
