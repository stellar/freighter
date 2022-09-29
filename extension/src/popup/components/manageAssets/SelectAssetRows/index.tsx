import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Types } from "@stellar/wallet-sdk";

import { AppDispatch } from "popup/App";
import {
  transactionSubmissionSelector,
  saveAsset,
  saveDestinationAsset,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { getCanonicalFromAsset, formatDomain } from "helpers/stellar";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import { Balances } from "@shared/api/types";

import "./styles.scss";

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
    assetDomains,
    blockedDomains,
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
  const hideBalances =
    assetSelect.type === AssetSelectType.PATH_PAY &&
    assetSelect.isSource === false;

  return (
    <SimpleBar
      className="SelectAssetRows__scrollbar"
      style={{
        maxHeight: `${maxHeight}px`,
      }}
    >
      <div className="SelectAssetRows__content">
        {assetRows.map(({ code, domain, image, issuer }) => {
          const assetDomain = assetDomains[getCanonicalFromAsset(code, issuer)];
          let isScamAsset = !!blockedDomains.domains[assetDomain];

          // ALEC TODO - remove
          if (
            issuer ===
            "GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II"
          ) {
            isScamAsset = true;
          }

          return (
            <div
              className="SelectAssetRows__row selectable"
              key={getCanonicalFromAsset(code, issuer)}
              onClick={() => {
                if (assetSelect.isSource) {
                  dispatch(saveAsset(getCanonicalFromAsset(code, issuer)));
                  history.goBack();
                } else {
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
                  {getAccountBalance(getCanonicalFromAsset(code, issuer))}{" "}
                  {code}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SimpleBar>
  );
};
