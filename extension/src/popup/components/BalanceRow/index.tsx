import React from "react";
import BigNumber from "bignumber.js";
import { isEmpty } from "lodash";
import { useTranslation } from "react-i18next";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { AssetIcons } from "@shared/api/types";
import {
  NO_FIAT_VALUE,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { getPriceDeltaColor } from "popup/helpers/balance";
import { getCanonicalFromAsset } from "helpers/stellar";
import { isNativeAssetPair } from "@shared/helpers/assetIdentity";

import "./styles.scss";

export interface BalanceRowProps {
  code: string;
  issuerKey?: string;
  assetIcons?: AssetIcons;
  /** Direct icon URL (used when there is no assetIcons map entry). */
  iconUrl?: string | null;
  isSuspicious?: boolean;
  isMalicious?: boolean;
  isLPShare?: boolean;
  retryAssetIconFetch?: (arg: { key: string; code: string }) => void;
  /** Formatted token balance, e.g. "123.45". */
  amount: string;
  /** Formatted fiat balance incl. symbol, e.g. "$12.34". When null the fiat
   * cell is omitted entirely (matches the account-home no-price row). */
  fiatAmount?: string | null;
  /** Raw 24h % change number string (e.g. "1.23"); drives color + display.
   * Null → NO_FIAT_VALUE. */
  percentChange?: string | null;
  onClick?: () => void;
  "data-testid"?: string;
  amountTestId?: string;
  fiatTestId?: string;
  deltaTestId?: string;
}

/**
 * Shared held-asset row: icon + token code + token balance on the left, fiat
 * balance + 24h % delta on the right. Used by the account-home balances list
 * and the Swap destination picker's "Your tokens" section.
 */
export const BalanceRow = ({
  code,
  issuerKey,
  assetIcons = {},
  iconUrl,
  isSuspicious = false,
  isMalicious = true,
  isLPShare = false,
  retryAssetIconFetch,
  amount,
  fiatAmount,
  percentChange,
  onClick,
  "data-testid": dataTestId,
  amountTestId,
  fiatTestId,
  deltaTestId,
}: BalanceRowProps) => {
  const { t } = useTranslation();
  const hasDelta = percentChange !== undefined && percentChange !== null;
  const hasFiat = fiatAmount !== undefined && fiatAmount !== null;

  // AssetIcon shows a perpetual loading state when assetIcons is empty (and the
  // asset isn't XLM). Callers that pass a single iconUrl (e.g. the swap picker's
  // held list) would otherwise hit that; synthesize a one-entry map for them.
  const canonical = getCanonicalFromAsset(code, issuerKey);
  const resolvedIcons =
    !isNativeAssetPair(code, issuerKey) && isEmpty(assetIcons)
      ? { [canonical]: iconUrl ?? "" }
      : assetIcons;
  const deltaColor = hasDelta
    ? getPriceDeltaColor(new BigNumber(roundUsdValue(percentChange as string)))
    : "";

  // XLM is the only token whose friendly name we hold locally; the rest fall
  // back to their code.
  const displayName = isNativeAssetPair(code, issuerKey)
    ? t("Stellar Lumens")
    : code;

  return (
    <div
      className={`BalanceRow ${onClick ? "BalanceRow--clickable" : ""}`}
      data-testid={dataTestId}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="BalanceRow__left">
        <AssetIcon
          assetIcons={resolvedIcons}
          code={code}
          issuerKey={issuerKey}
          icon={iconUrl || undefined}
          isLPShare={isLPShare}
          isSuspicious={isSuspicious}
          isMalicious={isMalicious}
          retryAssetIconFetch={retryAssetIconFetch}
        />
        <div className="BalanceRow__value">
          <span className="BalanceRow__code">{displayName}</span>
          <div className="BalanceRow__amount" data-testid={amountTestId}>
            {amount}
          </div>
        </div>
      </div>
      <div className="BalanceRow__right">
        {hasFiat && (
          <div className="BalanceRow__fiat" data-testid={fiatTestId}>
            {fiatAmount}
          </div>
        )}
        <div
          className={`BalanceRow__delta ${deltaColor}`}
          data-testid={deltaTestId}
        >
          {hasDelta
            ? `${formatAmount(roundUsdValue(percentChange as string))}%`
            : NO_FIAT_VALUE}
        </div>
      </div>
    </div>
  );
};
