import React from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AssetIcons } from "@shared/api/types";
import { PoolPosition } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import {
  formatAccountUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { getPoolPositionSummary } from "popup/components/earn/helpers/poolPositionSummary";
import {
  PositionTokenRow,
  toPositionTokenRows,
} from "popup/components/earn/helpers/positionRows";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";
import { PositionRow } from "./PositionRow";

interface MyPositionProps {
  position: PoolPosition;
  assetIcons: AssetIcons;
  networkDetails: NetworkDetails;
  onClose: () => void;
  /** "About pool" tapped -- opens the sheet with tabs hidden. */
  onAboutPool: () => void;
  /** A supplied-asset row tapped -- opens the sheet on Your position. */
  onSelectAsset: (row: PositionTokenRow) => void;
}

/**
 * One pool position in full: its totals, and the assets supplied to it.
 *
 * Rendered in place by the Positions tab as a bottom sheet, the same way the
 * Tokens tab opens AssetDetail — so the tab stays mounted underneath and
 * dismissal costs nothing. An X rather than a back arrow, matching AssetDetail
 * and CollectibleDetail.
 *
 * The totals header uses `getPoolPositionSummary` (pool-scoped: this
 * account's total and lifetime interest across the whole pool), while the
 * supplied-asset list below it uses `toPositionTokenRows` (token-scoped: one
 * row per asset, no gain column — that figure lives here in the header
 * instead, so it is never shown twice).
 */
export const MyPosition = ({
  position,
  assetIcons,
  networkDetails,
  onClose,
  onAboutPool,
  onSelectAsset,
}: MyPositionProps) => {
  const { t } = useTranslation();
  const summary = getPoolPositionSummary(position);
  const rows = toPositionTokenRows({
    positions: {
      address: "",
      totalValueUsd: null,
      netApy: null,
      positions: [position],
      backstop: [],
    },
    networkDetails,
  });

  return (
    <View data-testid="my-position-sheet">
      <SubviewHeader
        title={t("My position")}
        customBackIcon={<Icon.X />}
        customBackAction={onClose}
        data-testid="my-position-close"
      />
      <View.Content>
        <div className="MyPosition" data-testid="my-position-body">
          <div className="MyPosition__identity">
            <div className="MyPosition__chip">
              <PoolIcon />
              <Text as="span" size="sm" weight="medium">
                {t("Blend")}
              </Text>
            </div>
            <button
              type="button"
              className="MyPosition__about"
              onClick={onAboutPool}
              data-testid="my-position-about-pool"
            >
              {t("About pool")}
              <Icon.ChevronRight />
            </button>
          </div>

          <Text
            as="div"
            size="sm"
            weight="medium"
            addlClassName="MyPosition__pool-name"
          >
            {position.name || t("Blend pool")}
          </Text>
          <div className="MyPosition__total" data-testid="my-position-total">
            {formatAccountUsd(summary.totalUsd)}
          </div>
          <div className="MyPosition__gain" data-testid="my-position-gain">
            {summary.interestUsd === null || summary.gainPercent === null
              ? NO_FIAT_VALUE
              : `+${formatAccountUsd(summary.interestUsd)} (${formatRate(summary.gainPercent)})`}
          </div>

          <Text
            as="div"
            size="sm"
            weight="medium"
            addlClassName="MyPosition__section-title"
          >
            {t("Supplied asset")}
          </Text>
          <div className="MyPosition__assets">
            {rows.map((row) => (
              <PositionRow
                key={row.assetId}
                row={row}
                assetIcons={assetIcons}
                onClick={() => onSelectAsset(row)}
              />
            ))}
          </div>
        </div>
      </View.Content>
    </View>
  );
};
