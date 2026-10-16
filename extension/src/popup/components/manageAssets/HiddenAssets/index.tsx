import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getCanonicalFromAsset } from "helpers/stellar";
import { AssetListRow } from "popup/components/AssetListRow";
import { HiddenItemsSheet } from "popup/components/HiddenItemsSheet";
import { UnhideAssetButton } from "popup/components/manageAssets/ManageAssetRowButton";
import { iconsSelector } from "popup/ducks/cache";

export interface HiddenAssetRow {
  code: string;
  issuer: string;
  canonicalAsset: string;
}

/**
 * The held assets the user hid, as rows for the sheet. Reads every balance
 * (the caller must fetch with hidden assets included) and keeps the ones the
 * hidden map marks. LP shares and the native asset are never hidden.
 */
export const getHiddenAssetRows = (
  balances: AccountBalances["balances"] | undefined,
  isAssetHidden: (canonicalAsset: string) => boolean,
): HiddenAssetRow[] => {
  const rows: HiddenAssetRow[] = [];

  (balances || []).forEach((balance) => {
    let code = "";
    let issuer = "";

    if ("liquidityPoolId" in balance) {
      return;
    }

    if ("contractId" in balance && "symbol" in balance) {
      code = balance.symbol;
      issuer = balance.contractId;
    } else if (balance.token && "code" in balance.token) {
      code = balance.token.code;
      issuer = "issuer" in balance.token ? balance.token.issuer.key : "";
    }

    if (!code || !issuer) {
      return;
    }

    const canonicalAsset = getCanonicalFromAsset(code, issuer);

    if (isAssetHidden(canonicalAsset)) {
      rows.push({ code, issuer, canonicalAsset });
    }
  });

  return rows;
};

interface HiddenAssetsProps {
  isOpen: boolean;
  onClose: () => void;
  /** Balances fetched with hidden assets included */
  balances: AccountBalances | undefined;
  isAssetHidden: (canonicalAsset: string) => boolean;
  onUnhide: (asset: { code: string; canonicalAsset: string }) => void;
  /** Canonical of the asset whose unhide is in flight, if any */
  unhidingAsset?: string;
}

/**
 * Bottom sheet listing the hidden tokens with an Unhide button per row, and
 * an empty state when nothing is hidden. Opened from "Show hidden" on the
 * Add token screen.
 */
export const HiddenAssets = ({
  isOpen,
  onClose,
  balances,
  isAssetHidden,
  onUnhide,
  unhidingAsset,
}: HiddenAssetsProps) => {
  const { t } = useTranslation();
  const icons = useSelector(iconsSelector) || {};
  const rows = getHiddenAssetRows(balances?.balances, isAssetHidden);

  return (
    <HiddenItemsSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("Hidden tokens")}
      emptyText={t("No hidden tokens")}
      data-testid="hidden-assets"
      rows={rows.map(({ code, issuer, canonicalAsset }) => (
        <div key={canonicalAsset} data-testid={`hidden-asset-${code}`}>
          <AssetListRow
            code={code}
            issuer={issuer}
            iconUrl={icons[canonicalAsset]}
            codeTestId="HiddenAssetCode"
            rightElement={
              <UnhideAssetButton
                isLoading={unhidingAsset === canonicalAsset}
                onClick={() => onUnhide({ code, canonicalAsset })}
                data-testid={`hidden-asset-unhide-${code}`}
              />
            }
          />
        </div>
      ))}
    />
  );
};
