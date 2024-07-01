import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";

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
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import { Balance, Balances, SorobanBalance } from "@shared/api/types";
import { formatAmount } from "popup/helpers/formatters";
import { useIsSoroswapEnabled } from "popup/helpers/useIsSwap";

import "./styles.scss";

interface SelectAssetRowsProps {
  assetRows: ManageAssetCurrency[];
}

export const SelectAssetRows = ({ assetRows }: SelectAssetRowsProps) => {
  const {
    accountBalances: { balances = {} },
    assetSelect,
    blockedDomains,
    soroswapTokens,
    transactionData,
  } = useSelector(transactionSubmissionSelector);
  const dispatch: AppDispatch = useDispatch();
  const history = useHistory();
  const isSoroswapEnabled = useIsSoroswapEnabled();

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
          ({ code = "", domain, image = "", issuer = "", icon }) => {
            const isScamAsset = !!blockedDomains.domains[domain];
            const isContract = isContractId(issuer);
            const canonical = getCanonicalFromAsset(code, issuer);
            let isSoroswap = false;

            if (isSoroswapEnabled) {
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
                key={canonical}
                onClick={() => {
                  if (assetSelect.isSource) {
                    dispatch(saveAsset(canonical));
                    dispatch(saveIsToken(isContract));
                    history.goBack();
                  } else {
                    dispatch(saveDestinationAsset(canonical));
                    dispatch(saveDestinationIcon(icon));
                    history.goBack();
                  }
                  dispatch(saveIsSoroswap(isSoroswap));
                }}
              >
                <AssetIcon
                  assetIcons={code !== "XLM" ? { [canonical]: image } : {}}
                  code={code}
                  issuerKey={issuer}
                  icon={icon}
                />
                <div className="SelectAssetRows__row__info">
                  <div className="SelectAssetRows__row__info__header">
                    {code}
                    <ScamAssetIcon isScamAsset={isScamAsset} />
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
          },
        )}
      </div>
    </div>
  );
};
