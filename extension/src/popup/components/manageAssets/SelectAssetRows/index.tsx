import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { Types } from "@stellar/wallet-sdk";

import { AppDispatch } from "popup/App";
import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import {
  transactionSubmissionSelector,
  saveAsset,
  saveDestinationAsset,
  saveIsToken,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { sorobanSelector } from "popup/ducks/soroban";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { getCanonicalFromAsset, formatDomain } from "helpers/stellar";
import { getTokenBalance } from "popup/helpers/soroban";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import { Balances } from "@shared/api/types";

import "./styles.scss";
import { formatAmount } from "popup/helpers/formatters";

interface SelectAssetRowsProps {
  assetRows: ManageAssetCurrency[];
  maxHeight: number;
}

export const SelectAssetRows = ({
  assetRows,
  maxHeight,
}: SelectAssetRowsProps) => {
  const {
    accountBalances: { balances = {} },
    assetSelect,
    blockedDomains,
  } = useSelector(transactionSubmissionSelector);
  const { tokenBalances } = useSelector(sorobanSelector);
  const dispatch: AppDispatch = useDispatch();
  const history = useHistory();

  const getAccountBalance = (canonical: string) => {
    if (!balances) {
      return "";
    }
    const bal: Types.Balance = balances[canonical as keyof Balances];
    if (bal) {
      return bal.total.toString();
    }
    return "";
  };

  const calculateTokenBalance = (contractId: string) =>
    getTokenBalance(tokenBalances, contractId);

  // hide balances for path pay dest asset
  const hideBalances =
    assetSelect.type === AssetSelectType.PATH_PAY &&
    assetSelect.isSource === false;

  return (
    <SimpleBarWrapper
      className="SelectAssetRows__scrollbar"
      style={{
        maxHeight: `${maxHeight}px`,
      }}
    >
      <div className="SelectAssetRows__content">
        {assetRows.map(({ code, domain, image, issuer, contractId, name }) => {
          const isScamAsset = !!blockedDomains.domains[domain];
          const _issuer = contractId || issuer;
          const canonical = getCanonicalFromAsset(code, _issuer);

          return (
            <div
              className="SelectAssetRows__row selectable"
              key={canonical}
              onClick={() => {
                if (assetSelect.isSource) {
                  dispatch(saveAsset(canonical));
                  if (contractId) {
                    dispatch(saveIsToken(true));
                  } else {
                    dispatch(saveIsToken(false));
                  }
                  history.goBack();
                } else {
                  dispatch(saveDestinationAsset(canonical));
                  history.goBack();
                }
              }}
            >
              <AssetIcon
                assetIcons={code !== "XLM" ? { [canonical]: image } : {}}
                code={code}
                issuerKey={_issuer}
              />
              <div className="SelectAssetRows__row__info">
                <div className="SelectAssetRows__row__info__header">
                  {contractId ? name : code}
                  <ScamAssetIcon isScamAsset={isScamAsset} />
                </div>
                <div className="SelectAssetRows__domain">
                  {formatDomain(domain)}
                </div>
              </div>
              {!hideBalances && (
                <div>
                  {contractId
                    ? calculateTokenBalance(contractId)
                    : formatAmount(getAccountBalance(canonical))}{" "}
                  {code}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SimpleBarWrapper>
  );
};
