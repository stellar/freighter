import React from "react";
import BigNumber from "bignumber.js";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { AssetIcons } from "@shared/api/types";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { getPriceDeltaColor } from "popup/helpers/balance";

import "./styles.scss";

export interface BalanceRowProps {
  code: string;
  issuerKey?: string;
  assetIcons?: AssetIcons;
  /** Direct icon URL (used when there is no assetIcons map entry). */
  iconUrl?: string | null;
  isSuspicious?: boolean;
  isLPShare?: boolean;
  /** Formatted token balance, e.g. "123.45". */
  amount: string;
  /** Formatted fiat balance incl. symbol, e.g. "$12.34". Null → "--". */
  fiatAmount?: string | null;
  /** Raw 24h % change number string (e.g. "1.23"); drives color + display.
   * Null → "--". */
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
  isLPShare = false,
  amount,
  fiatAmount,
  percentChange,
  onClick,
  "data-testid": dataTestId,
  amountTestId,
  fiatTestId,
  deltaTestId,
}: BalanceRowProps) => {
  const hasDelta = percentChange !== undefined && percentChange !== null;
  const deltaColor = hasDelta
    ? getPriceDeltaColor(new BigNumber(roundUsdValue(percentChange as string)))
    : "";

  return (
    <div
      className="BalanceRow"
      data-testid={dataTestId}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="BalanceRow__left">
        <AssetIcon
          assetIcons={assetIcons}
          code={code}
          issuerKey={issuerKey}
          icon={iconUrl || undefined}
          isLPShare={isLPShare}
          isSuspicious={isSuspicious}
        />
        <div className="BalanceRow__value">
          <span className="BalanceRow__code">{code}</span>
          <div className="BalanceRow__amount" data-testid={amountTestId}>
            {amount}
          </div>
        </div>
      </div>
      <div className="BalanceRow__right">
        <div className="BalanceRow__fiat" data-testid={fiatTestId}>
          {fiatAmount ?? "--"}
        </div>
        <div
          className={`BalanceRow__delta ${deltaColor}`}
          data-testid={deltaTestId}
        >
          {hasDelta
            ? `${formatAmount(roundUsdValue(percentChange as string))}%`
            : "--"}
        </div>
      </div>
    </div>
  );
};
