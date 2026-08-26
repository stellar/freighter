import React, { useState } from "react";
import { Loader, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  AccountPositions as AccountPositionsData,
  BlendCatalogPool,
} from "@shared/api/types/blend";
import { AssetIcons } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  ScreenReaderOnly,
} from "popup/basics/shadcn/Sheet";
import { SlideupModal } from "popup/components/SlideupModal";
import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { PoolCard } from "./PoolCard";
import { MyPosition } from "./MyPosition";
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
  /** Empty state's annual projection in USD; null when there is nothing to total. */
  projectedUsd: string | null;
  /** Empty state's fallback figure — the best rate on offer; null when unknown too. */
  bestApy: number | null;
  /** Empty state's CTA was pressed, before it navigates to Earn. */
  onStartEarning: () => void;
  /** The catalog backing the pool-details sheet My position can open. */
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
 *
 * Lists one card per pool (Task 3) rather than one row per supplied token --
 * the token-shaped rows now live one level down, inside the My position sheet
 * a tapped card opens (Task 4).
 */
export const AccountPositions = ({
  positions,
  isLoading,
  hasError,
  assetIcons,
  networkDetails,
  projectedUsd,
  bestApy,
  onStartEarning,
  pools,
  onDeposit,
}: AccountPositionsProps) => {
  const { t } = useTranslation();
  // Which pool's My position sheet is open, if any. Declared unconditionally,
  // ahead of the early returns below, because Rules of Hooks forbids a hook
  // call that only some renders reach.
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  // What the pool-details modal nested inside My position is showing, if
  // anything. Cleared whenever My position itself closes (see
  // `closeMyPosition`) -- otherwise this survives to the next pool card tap
  // and reopens over a position it was never about.
  const [sheetMode, setSheetMode] = useState<
    { kind: "about" } | { kind: "asset"; row: PositionTokenRow } | null
  >(null);

  const closeMyPosition = () => {
    setSelectedPoolId(null);
    setSheetMode(null);
  };

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

  const poolPositions = positions?.positions ?? [];

  if (!poolPositions.length) {
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

  // Resolved from the tapped card's id rather than held directly, so the sheet
  // always renders the catalog's live figures instead of a snapshot taken at
  // click time.
  const selectedPosition =
    poolPositions.find((p) => p.id === selectedPoolId) ?? null;
  const selectedPool = pools.find((p) => p.id === selectedPoolId) ?? null;

  return (
    <div className="AccountPositions" data-testid="account-positions">
      <div className="AccountPositions__list">
        {poolPositions.map((position) => (
          <PoolCard
            key={position.id}
            position={position}
            onClick={() => setSelectedPoolId(position.id)}
          />
        ))}
      </div>

      <Sheet
        open={Boolean(selectedPosition)}
        onOpenChange={(open) => !open && closeMyPosition()}
      >
        <SheetContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          side="bottom"
          className="AccountPositions__my-position__wrapper"
        >
          <ScreenReaderOnly>
            <SheetTitle>{t("My position")}</SheetTitle>
          </ScreenReaderOnly>
          {selectedPosition && (
            <MyPosition
              position={selectedPosition}
              pool={selectedPool}
              assetIcons={assetIcons}
              networkDetails={networkDetails}
              onClose={closeMyPosition}
              onAboutPool={() => setSheetMode({ kind: "about" })}
              onSelectAsset={(row) => setSheetMode({ kind: "asset", row })}
            />
          )}
          <SlideupModal
            isModalOpen={Boolean(sheetMode && selectedPool)}
            setIsModalOpen={() => setSheetMode(null)}
            hasBackdrop
          >
            {sheetMode && selectedPool && selectedPosition ? (
              <PoolDetailsSheet
                pool={selectedPool}
                position={selectedPosition}
                focusedAssetId={
                  sheetMode.kind === "asset" ? sheetMode.row.assetId : undefined
                }
                overviewOnly={sheetMode.kind === "about"}
                assetIcons={assetIcons}
                defaultTab="your_position"
                onClose={() => setSheetMode(null)}
                onDeposit={
                  sheetMode.kind === "asset"
                    ? () => onDeposit(sheetMode.row, selectedPool)
                    : undefined
                }
              />
            ) : (
              <div />
            )}
          </SlideupModal>
        </SheetContent>
      </Sheet>
    </div>
  );
};
