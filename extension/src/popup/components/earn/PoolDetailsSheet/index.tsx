import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { BlendCatalogPool } from "@shared/api/types/blend";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { BLEND_LENDING_DOCS_URL } from "popup/constants/externalLinks";
import { openTab } from "popup/helpers/navigate";
import { StatRow } from "popup/components/earn/StatRow";
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
 *
 * The description is one string for every pool rather than a per-pool lookup:
 * it describes what supplying to a Blend pool does, and makes no claim about a
 * specific deployment. "View pool details" carries the pool-specific detail out
 * to Blend's docs instead.
 */
export const PoolDetailsSheet = ({ pool, onClose }: PoolDetailsSheetProps) => {
  const { t } = useTranslation();

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
