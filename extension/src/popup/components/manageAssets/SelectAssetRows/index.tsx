import React from "react";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { getCanonicalFromAsset, formatDomain } from "helpers/stellar";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getTokenBalance, isContractId } from "popup/helpers/soroban";
import { isSorobanBalance, getBalanceByIssuer } from "popup/helpers/balance";
import { formatAmount } from "popup/helpers/formatters";
import { SoroswapToken } from "@shared/api/types";

import "./styles.scss";

interface SelectAssetRowsProps {
  balances: AccountBalances;
  assetRows: ManageAssetCurrency[];
  onSelect: (canonical: string) => unknown;
  isPathPaymentDestAsset: boolean;
  soroswapTokens: SoroswapToken[];
}

export const SelectAssetRows = ({
  assetRows,
  balances,
  onSelect,
  isPathPaymentDestAsset,
  soroswapTokens,
}: SelectAssetRowsProps) => {
  const getAccountBalance = (issuer: string) => {
    if (!balances) {
      return "";
    }
    const balance = getBalanceByIssuer(issuer, balances.balances);
    if (balance) {
      return balance.total.toString();
    }
    return "";
  };

  const getTokenBalanceFromCanonical = (issuer: string) => {
    if (!balances) {
      return "";
    }
    const balance = getBalanceByIssuer(issuer, balances.balances);
    if (balance && isSorobanBalance(balance)) {
      return getTokenBalance(balance);
    }
    return "0";
  };

  // hide balances for path pay dest asset
  const hideBalances = isPathPaymentDestAsset;

  return (
    <div className="SelectAssetRows__scrollbar">
      <div className="SelectAssetRows__content">
        {assetRows.map(
          ({
            code = "",
            domain,
            image = "",
            issuer = "",
            icon,
            isSuspicious,
          }) => {
            const isScamAsset = isSuspicious || false;
            const isContract = isContractId(issuer);
            const canonical = getCanonicalFromAsset(code, issuer);

            return (
              <div
                className="SelectAssetRows__row selectable"
                data-testid={`Select-assets-row-${code}`}
                key={canonical}
                onClick={() => onSelect(canonical)}
              >
                <AssetIcon
                  assetIcons={code !== "XLM" ? { [canonical]: image } : {}}
                  code={code}
                  issuerKey={issuer}
                  icon={icon}
                  isSuspicious={isScamAsset}
                  soroswapTokens={soroswapTokens}
                />
                <div className="SelectAssetRows__row__info">
                  <div className="SelectAssetRows__row__info__header">
                    {code}
                  </div>
                  <div className="SelectAssetRows__domain">
                    {formatDomain(domain)}
                  </div>
                </div>
                {!hideBalances && (
                  <div>
                    {isContract
                      ? getTokenBalanceFromCanonical(issuer)
                      : formatAmount(getAccountBalance(issuer))}{" "}
                    {code}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};
