import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Types } from "@stellar/wallet-sdk";

import { AppDispatch } from "popup/App";
import {
  transactionSubmissionSelector,
  saveAsset,
  saveDestinationAsset,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { ASSET_SELECT } from "popup/components/sendPayment/SendAmount/AssetSelect";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { getCanonicalFromAsset, formatDomain } from "helpers/stellar";

import { Balances } from "@shared/api/types";

import "./styles.scss";

interface SelectAssetRowsProps {
  assetRows: ManageAssetCurrency[];
  maxHeight: number;
  selectingAssetType: string;
}

export const SelectAssetRows = ({
  assetRows,
  maxHeight,
  selectingAssetType,
}: SelectAssetRowsProps) => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const isSwap = params.get(ASSET_SELECT.SWAP_QUERY_PARAM);

  const {
    accountBalances: { balances = {} },
  } = useSelector(transactionSubmissionSelector);
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

  // hide balances for path pay dest asset
  const hideBalances = !isSwap && selectingAssetType === ASSET_SELECT.DEST;

  return (
    <SimpleBar
      className="SelectAssetRows__scrollbar"
      style={{
        maxHeight: `${maxHeight}px`,
      }}
    >
      <div className="SelectAssetRows__content">
        {assetRows.map(({ code, domain, image, issuer }) => (
          <div
            className="SelectAssetRows__row selectable"
            key={getCanonicalFromAsset(code, issuer)}
            onClick={() => {
              if (selectingAssetType === ASSET_SELECT.SOURCE) {
                dispatch(saveAsset(getCanonicalFromAsset(code, issuer)));
                history.goBack();
              } else if (selectingAssetType === ASSET_SELECT.DEST) {
                dispatch(
                  saveDestinationAsset(getCanonicalFromAsset(code, issuer)),
                );
                history.goBack();
              }
            }}
          >
            <AssetIcon
              assetIcons={
                code !== "XLM"
                  ? { [getCanonicalFromAsset(code, issuer)]: image }
                  : {}
              }
              code={code}
              issuerKey={issuer}
            />
            <div className="SelectAssetRows__code">
              {code}
              <div className="SelectAssetRows__domain">
                {formatDomain(domain)}
              </div>
            </div>
            {!hideBalances && (
              <div>
                {getAccountBalance(getCanonicalFromAsset(code, issuer))} {code}
              </div>
            )}
          </div>
        ))}
      </div>
    </SimpleBar>
  );
};
