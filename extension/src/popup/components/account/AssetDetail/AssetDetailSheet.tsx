import React, { useEffect } from "react";

import { RequestState } from "constants/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getAssetFromCanonical } from "helpers/stellar";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { AssetDetail } from "popup/components/account/AssetDetail";
import {
  NonHeldAssetDescriptor,
  NonHeldAssetDetail,
} from "popup/components/account/AssetDetail/NonHeldAssetDetail";
import { TokenChartSource } from "popup/components/account/TokenPriceChart/constants";
import { getBalanceByAsset } from "popup/helpers/balance";
import { useGetAccountHistoryData } from "popup/views/Account/hooks/useGetAccountHistoryData";

interface AssetDetailSheetProps {
  asset: NonHeldAssetDescriptor | null; // null = closed
  accountBalances: AccountBalances;
  source: TokenChartSource;
  onClose: () => void;
}

export const AssetDetailSheet = ({
  asset,
  accountBalances,
  source,
  onClose,
}: AssetDetailSheetProps) => {
  const { state, fetchData } = useGetAccountHistoryData();
  const canonical = asset?.canonical;
  const isHeld =
    !!canonical &&
    !!getBalanceByAsset(
      getAssetFromCanonical(canonical),
      accountBalances.balances,
    );

  // Keyed on the canonical and held-ness only: refetching on every balances
  // change would re-fire the history request while the sheet is open.
  useEffect(() => {
    if (isHeld) {
      void fetchData({ balances: accountBalances, useCache: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonical, isHeld]);

  return (
    <Sheet
      open={asset !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
        side="bottom"
        className="AccountAssets__asset-detail__wrapper"
      >
        {asset && (
          <>
            <ScreenReaderOnly>
              <SheetTitle>{asset.canonical}</SheetTitle>
            </ScreenReaderOnly>
            {isHeld ? (
              <AssetDetail
                accountBalances={accountBalances}
                historyData={state.data}
                hasHistoryError={state.state === RequestState.ERROR}
                selectedAsset={asset.canonical}
                source={source}
                handleClose={onClose}
              />
            ) : (
              <NonHeldAssetDetail
                asset={asset}
                source={source}
                handleClose={onClose}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
