import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { AssetIcons } from "@shared/api/types";
import { BlendCatalogPool, PoolPosition } from "@shared/api/types/blend";
import { isEarnSupportedNetwork } from "@shared/constants/blend";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { BLEND_LENDING_DOCS_URL } from "popup/constants/externalLinks";
import { earnDepositSelector } from "popup/ducks/remoteConfig";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { openTab } from "popup/helpers/navigate";
import { hasResolvableSupply } from "popup/components/earn/helpers/positionSummary";
import { StatRow } from "popup/components/earn/StatRow";
import {
  formatCompactUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";

import { PoolDetailsTab, Tabs } from "./Tabs";
import { YourPosition } from "./YourPosition";

import "./styles.scss";

interface PoolDetailsSheetProps {
  pool: BlendCatalogPool;
  onClose: () => void;
  /**
   * The account's position in this pool. Absent or null renders exactly what
   * this sheet rendered before positions existed: no tabs, and Close.
   */
  position?: PoolPosition | null;
  /** Which supplied asset the sheet was opened from (see getPositionSummary). */
  focusedAssetId?: string;
  /** Supplied → the CTA is Deposit; omitted → it stays Close. */
  onDeposit?: () => void;
  /**
   * Which tab opens first. "your_position" from a Positions row — the user
   * tapped their position; "overview" from the amount screen's pool card —
   * they tapped the pool.
   */
  defaultTab?: PoolDetailsTab;
  /** Fires only on a tap that changes the tab, never on mount. */
  onTabChange?: (tab: PoolDetailsTab) => void;
  assetIcons?: AssetIcons;
  /** Hide the tab strip and show Overview alone, even when a position exists.
   *  "About pool" asks about the pool, not about the user's stake in it. */
  overviewOnly?: boolean;
}

/**
 * Pool description and market stats — the Overview tab's body, and this
 * sheet's whole body before positions existed.
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
const OverviewBody = ({ pool }: { pool: BlendCatalogPool }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="PoolDetailsSheet__description">
        <Text
          as="div"
          size="sm"
          weight="medium"
          addlClassName="PoolDetailsSheet__section-title"
        >
          {t("Description")}
        </Text>
        {/* A div, not a p: the SDS theme gives `p:not(:last-child)` a 1.5rem
            bottom margin at a specificity that beats `.Text`, so the copy
            grew a 24px gap the moment the link was added below it. The theme
            also forces `p` to 16px/28px — `md` is the same 16px at the
            design's 24px leading. */}
        <Text as="div" size="md">
          {t(
            "Deposit supported assets into this Blend pool to earn yield. APY may change over time. Withdraw anytime.",
          )}
        </Text>
        <button
          type="button"
          className="PoolDetailsSheet__docs-link"
          onClick={() => openTab(BLEND_LENDING_DOCS_URL)}
          data-testid="earn-pool-docs-link"
        >
          {t("View pool details")}
          <Icon.LinkExternal01 />
        </button>
      </div>

      <Text
        as="div"
        size="sm"
        weight="medium"
        addlClassName="PoolDetailsSheet__section-title"
      >
        {t("Pool Performance")}
      </Text>

      <div className="PoolDetailsSheet__group">
        <StatRow
          label={t("Interest")}
          value={formatRate(pool.interestApy)}
          testId="earn-pool-interest-apy"
        />
        <StatRow
          label={t("Net APY")}
          value={formatRate(pool.netApy)}
          isPositive
          testId="earn-pool-net-apy"
        />
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
    </>
  );
};

/**
 * Pool details, opened from the pool card on the amount screen or, once the
 * account holds a position, from a Positions row.
 *
 * Purely additive over the pre-positions sheet: with no `position` prop this
 * renders exactly as it always has — no tab strip, the Overview body alone,
 * and a Close button. Only supplying `position` AND a resolvable supply row —
 * see `hasResolvableSupply` — turns on the pill tab strip and lets the sheet
 * open on either tab; a `focusedAssetId` that names an asset the position
 * doesn't hold is treated the same as no position at all, rather than
 * showing a "Your position" tab with nothing in it. `onDeposit` independently
 * swaps the footer button from Close to Deposit — the two are separate knobs
 * because the deposit flow opens this sheet mid-deposit with a position
 * already on file but no Deposit action of its own to offer.
 *
 * `overviewOnly` is a third configuration layered on top of both: the
 * account may well hold a position, but "About pool" asked about the pool,
 * not the stake in it. It gates `hasPosition` itself, so the tab strip hides
 * and the Overview pane renders through the same path a genuinely
 * position-less account takes — no separate branch — and the CTA stays
 * Close even when `onDeposit` is supplied.
 */
export const PoolDetailsSheet = ({
  pool,
  onClose,
  position,
  focusedAssetId,
  onDeposit,
  defaultTab,
  onTabChange,
  assetIcons = {},
  overviewOnly,
}: PoolDetailsSheetProps) => {
  const { t } = useTranslation();
  const isEarnDepositEnabled = useSelector(earnDepositSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const hasPosition =
    !overviewOnly &&
    Boolean(position && hasResolvableSupply({ position, focusedAssetId }));
  // Gated on the same flag and network as every other route into the deposit
  // flow -- a pool this account cannot deposit into should not offer to,
  // even mid-flow with a handler already on hand.
  const canDeposit =
    !overviewOnly &&
    Boolean(onDeposit) &&
    isEarnDepositEnabled &&
    isEarnSupportedNetwork(networkDetails);
  const [activeTab, setActiveTab] = React.useState<PoolDetailsTab>(
    defaultTab ?? "your_position",
  );
  const showsPosition = hasPosition && activeTab === "your_position";

  const selectTab = (tab: PoolDetailsTab) => {
    // A tap on the tab already active is not a change; reporting it would
    // inflate the switch metric with no-ops.
    if (tab === activeTab) {
      return;
    }
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="PoolDetailsSheet" data-testid="earn-pool-details-sheet">
      <div className="PoolDetailsSheet__header">
        <PoolIcon />
        <div className="PoolDetailsSheet__identity">
          <Text as="div" size="sm" weight="medium">
            {pool.name || t("Blend pool")}
          </Text>
          <Text as="div" size="xs" addlClassName="PoolDetailsSheet__tagline">
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

      {hasPosition && <Tabs active={activeTab} onSelect={selectTab} />}

      <div
        className="PoolDetailsSheet__body"
        data-testid="earn-pool-details-body"
      >
        {showsPosition && position ? (
          <YourPosition
            position={position}
            focusedAssetId={focusedAssetId}
            assetIcons={assetIcons}
          />
        ) : (
          <OverviewBody pool={pool} />
        )}
      </div>

      <Button
        size="md"
        variant="tertiary"
        isFullWidth
        isRounded
        onClick={canDeposit ? onDeposit : onClose}
      >
        {canDeposit ? t("Deposit") : t("Close")}
      </Button>
    </div>
  );
};
