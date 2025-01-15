import React from "react";
import { Toggle } from "@stellar/design-system";
import { useDispatch, useSelector } from "react-redux";

import { IssuerKey } from "@shared/api/types";
import {
  formatDomain,
  getCanonicalFromAsset,
  truncateString,
} from "helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { changeAssetVisibility, settingsSelector } from "popup/ducks/settings";
import { isAssetVisible } from "popup/helpers/settings";
import { AssetRowData, ManageAssetCurrency } from "../ManageAssetRows";

import "./styles.scss";

interface ToggleAssetRowsProps {
  assetRows: ManageAssetCurrency[];
}

export const ToggleAssetRows = ({ assetRows }: ToggleAssetRowsProps) => {
  const dispatch = useDispatch();
  const { hiddenAssets } = useSelector(settingsSelector);
  const handleIsVisibleChange = (issuer: IssuerKey) => {
    const visibility = isAssetVisible(hiddenAssets, issuer)
      ? "hidden"
      : "visible";
    dispatch(
      changeAssetVisibility({
        issuer,
        visibility,
      }),
    );
  };

  return (
    <>
      <div className="ManageAssetRows__scrollbar">
        <div className="ManageAssetRows__content">
          {assetRows.map(
            ({
              code = "",
              domain,
              image = "",
              issuer = "",
              name = "",
              isSuspicious,
            }) => {
              const canonicalAsset = getCanonicalFromAsset(code, issuer);
              return (
                <div
                  className="ManageAssetRows__row"
                  key={canonicalAsset}
                  data-testid="ManageAssetRow"
                >
                  <ToggleAssetRow
                    code={code}
                    issuer={issuer}
                    image={image}
                    domain={domain}
                    name={name}
                    isSuspicious={isSuspicious}
                  />
                  <Toggle
                    checked={isAssetVisible(hiddenAssets, issuer)}
                    id="isVisible"
                    // @ts-ignore
                    onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                      handleIsVisibleChange(issuer)
                    }
                  />
                </div>
              );
            },
          )}
        </div>
      </div>
    </>
  );
};

export const ToggleAssetRow = ({
  code = "",
  issuer = "",
  image = "",
  domain,
  name,
  isSuspicious = false,
}: AssetRowData) => {
  const canonicalAsset = getCanonicalFromAsset(code, issuer);
  const assetCode = name || code;
  const truncatedAssetCode =
    assetCode.length > 20 ? truncateString(assetCode) : assetCode;

  return (
    <>
      <AssetIcon
        assetIcons={code !== "XLM" ? { [canonicalAsset]: image } : {}}
        code={code}
        issuerKey={issuer}
        isSuspicious={isSuspicious}
      />
      <div className="ManageAssetRows__row__info">
        <div className="ManageAssetRows__row__info__header">
          <span data-testid="ManageAssetCode">{truncatedAssetCode}</span>
        </div>
        <div
          className="ManageAssetRows__domain"
          data-testid="ManageAssetDomain"
        >
          {formatDomain(domain)}
        </div>
      </div>
    </>
  );
};
