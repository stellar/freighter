import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Asset } from "stellar-sdk";

import { AppDispatch } from "popup/App";
import {
  transactionSubmissionSelector,
  saveAsset,
  saveDestinationAsset,
  saveDestinationIcon,
  saveIsToken,
  AssetSelectType,
  saveIsSoroswap,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import {
  getCanonicalFromAsset,
  formatDomain,
  getAssetFromCanonical,
} from "helpers/stellar";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getTokenBalance, isContractId } from "popup/helpers/soroban";
import { isSorobanBalance, getBalanceByAsset } from "popup/helpers/balance";
import { formatAmount } from "popup/helpers/formatters";
import { useIsSoroswapEnabled, useIsSwap } from "popup/helpers/useIsSwap";

import "./styles.scss";

interface SelectAssetRowsProps {
  balances: AccountBalances;
  assetRows: ManageAssetCurrency[];
  onSelect: () => unknown;
}

export const SelectAssetRows = ({
  assetRows,
  balances,
  onSelect,
}: SelectAssetRowsProps) => {
  const { assetSelect, soroswapTokens, transactionData } = useSelector(
    transactionSubmissionSelector,
  );
  const dispatch = useDispatch<AppDispatch>();
  const isSoroswapEnabled = useIsSoroswapEnabled();
  const isSwap = useIsSwap();

  const getAccountBalance = (
    canonical: Asset | { code: string; issuer: string },
  ) => {
    if (!balances) {
      return "";
    }
    const balance = getBalanceByAsset(canonical, balances.balances);
    if (balance) {
      return balance.total.toString();
    }
    return "";
  };

  const getTokenBalanceFromCanonical = (
    canonical: Asset | { code: string; issuer: string },
  ) => {
    if (!balances) {
      return "";
    }
    const balance = getBalanceByAsset(canonical, balances.balances);
    if (balance && isSorobanBalance(balance)) {
      return getTokenBalance(balance);
    }
    return "0";
  };

  // hide balances for path pay dest asset
  const hideBalances =
    assetSelect.type === AssetSelectType.PATH_PAY &&
    assetSelect.isSource === false;

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
            let isSoroswap = false;

            if (isSoroswapEnabled && isSwap) {
              // check if either asset is a Soroswap token
              const otherAsset = getAssetFromCanonical(
                assetSelect.isSource
                  ? transactionData.destinationAsset
                  : transactionData.asset,
              );
              isSoroswap =
                !!soroswapTokens.find(({ contract }) => contract === issuer) ||
                !!soroswapTokens.find(
                  ({ contract }) => contract === otherAsset.issuer,
                );
            }

            return (
              <div
                className="SelectAssetRows__row selectable"
                data-testid={`Select-assets-row-${code}`}
                key={canonical}
                onClick={() => {
                  if (assetSelect.isSource) {
                    dispatch(saveAsset(canonical));
                    dispatch(saveIsToken(isContract));
                    onSelect();
                  } else {
                    dispatch(saveDestinationAsset(canonical));
                    dispatch(saveDestinationIcon(icon));
                    onSelect();
                  }
                  dispatch(saveIsSoroswap(isSoroswap));
                }}
              >
                <AssetIcon
                  assetIcons={code !== "XLM" ? { [canonical]: image } : {}}
                  code={code}
                  issuerKey={issuer}
                  icon={icon}
                  isSuspicious={isScamAsset}
                />
                <div className="SelectAssetRows__row__info">
                  <div className="SelectAssetRows__row__info__header">
                    {code}
                  </div>
                  <div className="SelectAssetRows__domain">
                    {formatDomain(domain || "")}
                  </div>
                </div>
                {!hideBalances && (
                  <div>
                    {isContract
                      ? getTokenBalanceFromCanonical({ code, issuer })
                      : formatAmount(getAccountBalance({ code, issuer }))}{" "}
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
