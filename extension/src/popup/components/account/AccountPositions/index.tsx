import React, { useEffect, useMemo, useState } from "react";
import { Loader, Notification } from "@stellar/design-system";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import {
  AccountPositions as AccountPositionsData,
  BlendCatalogPool,
} from "@shared/api/types/blend";
import { AssetIcons } from "@shared/api/types";
import {
  getBlendPoolId,
  isEarnSupportedNetwork,
} from "@shared/constants/blend";
import { NetworkDetails } from "@shared/constants/stellar";

import {
  PositionTokenRow,
  toPositionTokenRows,
} from "popup/components/earn/helpers/positionRows";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  ScreenReaderOnly,
} from "popup/basics/shadcn/Sheet";
import { InlineAddButton } from "popup/components/account/InlineAddButton";
import { EARN_SOURCE, EARN_SOURCE_KEY } from "popup/constants/earn";
import { ROUTES } from "popup/constants/routes";
import { earnDepositSelector } from "popup/ducks/remoteConfig";
import {
  POOL_DETAILS_SOURCE,
  trackEarnPoolDetailsOpened,
  trackEarnPoolDetailsTabSelected,
} from "popup/metrics/earn";
import {
  trackPoolSelected,
  trackPositionRowSelected,
} from "popup/metrics/positions";
import { PoolCard } from "./PoolCard";
import { EmptyState } from "./EmptyState";
import { PoolPositionScreen } from "./PoolPositionScreen";
import { TokenPositionScreen } from "./TokenPositionScreen";

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
  /** The catalog the token screen's Deposit needs to prefill the flow. */
  pools: BlendCatalogPool[];
  /** Deposit tapped on a token's position screen, with its resolved pool. */
  onDeposit: (row: PositionTokenRow, pool: BlendCatalogPool) => void;
}

/**
 * The Home screen's Positions tab (Figma Varial 4464:110302, 4470:111628).
 *
 * Structured like AccountCollectibles, with one addition: a real error state.
 * Collectibles swallow their failures because an unreachable collectible is
 * indistinguishable from an unowned one; a position is money, so "we could not
 * load this" must never render as "you have none".
 *
 * One card per pool. A card opens the pool's screen, and a supplied token there
 * opens the token's screen over it. Both are full-height sheets rendered in
 * place, as the Tokens tab opens a token's details, so Home stays underneath
 * and closing needs no navigation.
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
  const isEarnDepositEnabled = useSelector(earnDepositSelector);
  const canDeposit =
    isEarnDepositEnabled && isEarnSupportedNetwork(networkDetails);
  // Declared unconditionally, ahead of the early returns below, because Rules
  // of Hooks forbids a hook call that only some renders reach.
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Resolved from ids rather than held directly, so the screens always render
  // the live figures of the 30-second refresh, not a snapshot from the tap.
  const poolPositions = positions?.positions ?? [];
  const selectedPosition =
    poolPositions.find((p) => p.id === selectedPoolId) ?? null;
  const poolRows = useMemo(
    () =>
      selectedPosition
        ? toPositionTokenRows({ positions, networkDetails }).filter(
            (row) => row.poolId === selectedPosition.id,
          )
        : [],
    [positions, networkDetails, selectedPosition],
  );
  const selectedRow =
    poolRows.find((row) => row.assetId === selectedAssetId) ?? null;
  const selectedPool =
    pools.find((pool) => pool.id === selectedPosition?.id) ?? null;

  const closePool = () => {
    setSelectedPoolId(null);
    setSelectedAssetId(null);
  };

  // A refresh can drop the open pool or token (closed, drained) with no tap.
  // The sheets close on their own when their position stops resolving, but the
  // ids stay set, and a pool that came back on a later tick would reopen by
  // itself. Clear them the moment they stop resolving.
  useEffect(() => {
    if (selectedPoolId !== null && selectedPosition === null) {
      setSelectedPoolId(null);
      setSelectedAssetId(null);
    }
  }, [selectedPoolId, selectedPosition]);

  useEffect(() => {
    if (selectedAssetId !== null && selectedRow === null) {
      setSelectedAssetId(null);
    }
  }, [selectedAssetId, selectedRow]);

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

  if (!poolPositions.length) {
    return (
      <div
        className="AccountPositions AccountPositions--empty"
        data-testid="account-positions"
      >
        <EmptyState
          projectedUsd={projectedUsd}
          bestApy={bestApy}
          onStartEarning={onStartEarning}
        />
      </div>
    );
  }

  return (
    <div className="AccountPositions" data-testid="account-positions">
      <div className="AccountPositions__list">
        {poolPositions.map((position) => (
          <PoolCard
            key={position.id}
            position={position}
            onClick={() => {
              trackPoolSelected({
                poolId: position.id,
                protocol: position.protocol,
              });
              setSelectedPoolId(position.id);
            }}
          />
        ))}
      </div>

      {/* The tab's own add button, as Tokens and Collectibles end theirs. */}
      {canDeposit && (
        <InlineAddButton
          label={t("Deposit")}
          route={ROUTES.earn}
          search={`?${EARN_SOURCE_KEY}=${EARN_SOURCE.POSITIONS_PILL}`}
          data-testid="positions-deposit-btn"
        />
      )}

      <Sheet
        open={Boolean(selectedPosition)}
        onOpenChange={(open) => !open && closePool()}
      >
        <SheetContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          side="bottom"
          className="AccountPositions__screen"
        >
          <ScreenReaderOnly>
            <SheetTitle>{t("Position details")}</SheetTitle>
          </ScreenReaderOnly>
          {selectedPosition && (
            <PoolPositionScreen
              position={selectedPosition}
              rows={poolRows}
              assetIcons={assetIcons}
              onBack={closePool}
              onSelectToken={(row) => {
                trackPositionRowSelected({
                  poolId: selectedPosition.id,
                  protocol: selectedPosition.protocol,
                  assetCode: row.code,
                });
                trackEarnPoolDetailsOpened({
                  poolId: selectedPosition.id,
                  source: POOL_DETAILS_SOURCE.POSITION_ROW,
                });
                setSelectedAssetId(row.assetId);
              }}
            />
          )}

          <Sheet
            open={Boolean(selectedRow)}
            onOpenChange={(open) => !open && setSelectedAssetId(null)}
          >
            <SheetContent
              onOpenAutoFocus={(e) => e.preventDefault()}
              aria-describedby={undefined}
              side="bottom"
              className="AccountPositions__screen"
            >
              <ScreenReaderOnly>
                <SheetTitle>{selectedRow?.code}</SheetTitle>
              </ScreenReaderOnly>
              {selectedPosition && selectedRow && (
                <TokenPositionScreen
                  position={selectedPosition}
                  row={selectedRow}
                  assetIcons={assetIcons}
                  networkDetails={networkDetails}
                  // Depositing prefills the pool, so it needs its catalog
                  // entry, and only the pool Earn offers qualifies: the token
                  // picker lists that one pool alone, so this entry must not
                  // open deposits into a pool the flow hasn't vetted.
                  canDeposit={
                    canDeposit &&
                    Boolean(selectedPool) &&
                    selectedPosition.id === getBlendPoolId(networkDetails)
                  }
                  onClose={() => setSelectedAssetId(null)}
                  onDeposit={() => {
                    if (selectedPool) {
                      onDeposit(selectedRow, selectedPool);
                    }
                  }}
                  onTabChange={(tab) =>
                    trackEarnPoolDetailsTabSelected({
                      poolId: selectedPosition.id,
                      tab,
                      source: POOL_DETAILS_SOURCE.POSITION_ROW,
                    })
                  }
                />
              )}
            </SheetContent>
          </Sheet>
        </SheetContent>
      </Sheet>
    </div>
  );
};
