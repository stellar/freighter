import React, { useState } from "react";
import { Loader, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  AccountPositions as AccountPositionsData,
  BlendCatalogPool,
} from "@shared/api/types/blend";
import { AssetIcons } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

import {
  PositionTokenRow,
  toPositionTokenRows,
} from "popup/components/earn/helpers/positionRows";
import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { SlideupModal } from "popup/components/SlideupModal";
import { PositionRow } from "./PositionRow";
import { EmptyState } from "./EmptyState";

import "./styles.scss";

interface AccountPositionsProps {
  positions: AccountPositionsData | null;
  /**
   * The request has not settled. Distinct from having none: `positions` is
   * empty in both cases, and showing the empty state here would tell the
   * account it holds nothing while the answer is still in flight.
   */
  isLoading: boolean;
  /** The request rejected. Renders instead of the empty state, never beside it. */
  hasError: boolean;
  assetIcons: AssetIcons;
  networkDetails: NetworkDetails;
  /** A row was clicked; opens that position's pool-details sheet (Task 10). */
  onSelectRow: (row: PositionTokenRow) => void;
  /** Empty state's annual projection in USD; null when there is nothing to total. */
  projectedUsd: string | null;
  /** Empty state's fallback figure — the best rate on offer; null when unknown too. */
  bestApy: number | null;
  /** Empty state's CTA was pressed, before it navigates to Earn. */
  onStartEarning: () => void;
  /** The catalog backing the pool-details sheet opened from a tapped row. */
  pools: BlendCatalogPool[];
  /** Deposit tapped inside that sheet, with the row and its resolved pool. */
  onDeposit: (row: PositionTokenRow, pool: BlendCatalogPool) => void;
}

/**
 * The Home screen's Positions tab.
 *
 * Structured like AccountCollectibles, with one addition: a real error state.
 * Collectibles swallow their failures because an unreachable collectible is
 * indistinguishable from an unowned one; a position is money, so "we could not
 * load this" must never render as "you have none".
 *
 * The error renders inside the pane rather than through the view's
 * `AccountView__fetch-fail` notification, which sits above the slider and would
 * push a banner across the Tokens and Collectibles tabs too.
 */
export const AccountPositions = ({
  positions,
  isLoading,
  hasError,
  assetIcons,
  networkDetails,
  onSelectRow,
  projectedUsd,
  bestApy,
  onStartEarning,
  pools,
  onDeposit,
}: AccountPositionsProps) => {
  const { t } = useTranslation();
  // Which row's pool sheet is open, if any. Declared unconditionally, ahead of
  // the early returns below, because Rules of Hooks forbids a hook call that
  // only some renders reach.
  const [selected, setSelected] = useState<PositionTokenRow | null>(null);

  if (isLoading) {
    return (
      <div className="AccountPositions" data-testid="account-positions">
        <div
          className="AccountPositions__loader"
          data-testid="account-positions-loader"
        >
          <Loader size="2rem" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="AccountPositions" data-testid="account-positions">
        <div
          className="AccountPositions__error"
          data-testid="account-positions-error"
        >
          <Notification
            variant="error"
            title={t("Failed to fetch your positions.")}
          >
            {t("Your positions could not be fetched at this time.")}
          </Notification>
        </div>
      </div>
    );
  }

  const rows = toPositionTokenRows({ positions, networkDetails });

  if (!rows.length) {
    return (
      <div className="AccountPositions" data-testid="account-positions">
        <EmptyState
          projectedUsd={projectedUsd}
          bestApy={bestApy}
          onStartEarning={onStartEarning}
        />
      </div>
    );
  }

  // Resolved from the tapped row's id rather than held directly, so the sheet
  // always renders the catalog's live figures instead of a snapshot taken at
  // click time.
  const selectedPool = pools.find((p) => p.id === selected?.poolId) ?? null;
  const selectedPosition =
    positions?.positions.find((p) => p.id === selected?.poolId) ?? null;

  return (
    <div className="AccountPositions" data-testid="account-positions">
      <div className="AccountPositions__list">
        {rows.map((row) => (
          <PositionRow
            key={`${row.poolId}-${row.assetId}`}
            row={row}
            assetIcons={assetIcons}
            onClick={() => {
              onSelectRow(row);
              setSelected(row);
            }}
          />
        ))}
      </div>

      <SlideupModal
        isModalOpen={Boolean(selected && selectedPool)}
        setIsModalOpen={() => setSelected(null)}
        hasBackdrop
      >
        {selected && selectedPool ? (
          <PoolDetailsSheet
            pool={selectedPool}
            position={selectedPosition}
            focusedAssetId={selected.assetId}
            assetIcons={assetIcons}
            defaultTab="your_position"
            onClose={() => setSelected(null)}
            onDeposit={() => onDeposit(selected, selectedPool)}
          />
        ) : (
          <div />
        )}
      </SlideupModal>
    </div>
  );
};
