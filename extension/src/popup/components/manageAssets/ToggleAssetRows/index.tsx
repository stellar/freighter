import React from "react";
import { Toggle } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AssetVisibility, IssuerKey } from "@shared/api/types";
import {
  formatDomain,
  getCanonicalFromAsset,
  truncateString,
} from "helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { isAssetVisible } from "popup/helpers/settings";
import { AssetVisibilityData } from "../AssetVisibility/hooks/useGetAssetData";
import { AssetRowData, ManageAssetCurrency } from "../ManageAssetRows";

import "./styles.scss";

interface ToggleAssetRowsProps {
  assetRows: ManageAssetCurrency[];
  hiddenAssets: Record<IssuerKey, AssetVisibility>;
  changeAssetVisibility: ({
    issuer,
    visibility,
  }: {
    issuer: IssuerKey;
    visibility: AssetVisibility;
  }) => Promise<AssetVisibilityData>;
}

export const ToggleAssetRows = ({
  assetRows,
  hiddenAssets,
  changeAssetVisibility,
}: ToggleAssetRowsProps) => {
  const handleIsVisibleChange = async (issuer: IssuerKey) => {
    const visibility = isAssetVisible(hiddenAssets, issuer)
      ? "hidden"
      : "visible";
    await changeAssetVisibility({ issuer, visibility });
  };

  return (
    <>
      <div className="ToggleAssetRows__scrollbar">
        <div
          className="ToggleAssetRows__content"
          data-testid="ToggleAssetContent"
        >
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
                  className="ToggleAssetRows__row"
                  key={canonicalAsset}
                  data-testid={`Toggle-${code}`}
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
                    checked={isAssetVisible(hiddenAssets, canonicalAsset)}
                    id={`isVisible-${canonicalAsset}`}
                    // @ts-ignore
                    onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                      handleIsVisibleChange(canonicalAsset)
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
  const { t } = useTranslation();
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
      <div className="ToggleAssetRows__row__info">
        <div className="ToggleAssetRows__row__info__header">
          <span data-testid="ToggleAssetCode">{truncatedAssetCode}</span>
        </div>
        <div
          className="ToggleAssetRows__domain"
          data-testid="ToggleAssetDomain"
        >
          {formatDomain(domain || "")}
        </div>
      </div>
    </>
  );
};
