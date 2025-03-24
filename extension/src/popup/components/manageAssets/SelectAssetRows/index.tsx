import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

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
import { getTokenBalance, isContractId } from "popup/helpers/soroban";
import { Balance, Balances, SorobanBalance } from "@shared/api/types";
import { formatAmount } from "popup/helpers/formatters";
import { useIsSoroswapEnabled, useIsSwap } from "popup/helpers/useIsSwap";

import "./styles.scss";

interface SelectAssetRowsProps {
  assetRows: ManageAssetCurrency[];
}

export const SelectAssetRows = ({ assetRows }: SelectAssetRowsProps) => {
  const {
    accountBalances: { balances = {} },
    assetSelect,
    soroswapTokens,
    transactionData,
  } = useSelector(transactionSubmissionSelector);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isSoroswapEnabled = useIsSoroswapEnabled();
  const isSwap = useIsSwap();

  const getAccountBalance = (canonical: string) => {
    if (!balances) {
      return "";
    }
    const bal: Balance = balances[canonical as keyof Balances];
    if (bal) {
      return bal.total.toString();
    }
    return "";
  };

  const getTokenBalanceFromCanonical = (canonical: string) => {
    if (!balances) {
      return "";
    }
    const bal: SorobanBalance = balances[canonical as keyof Balances];
    if (bal) {
      return getTokenBalance(bal);
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
                  : transactionData.asset
              );
              isSoroswap =
                !!soroswapTokens.find(({ contract }) => contract === issuer) ||
                !!soroswapTokens.find(
                  ({ contract }) => contract === otherAsset.issuer
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
                    navigate(-1);
                  } else {
                    dispatch(saveDestinationAsset(canonical));
                    dispatch(saveDestinationIcon(icon));
                    navigate(-1);
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
                    {formatDomain(domain)}
                  </div>
                </div>
                {!hideBalances && (
                  <div>
                    {isContract
                      ? getTokenBalanceFromCanonical(canonical)
                      : formatAmount(getAccountBalance(canonical))}{" "}
                    {code}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};
