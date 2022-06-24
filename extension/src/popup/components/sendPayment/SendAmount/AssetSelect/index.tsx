import React from "react";
import { useSelector } from "react-redux";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";

import "./styles.scss";

export enum ASSET_SELECT {
  QUERY_PARAM = "assetSelect",
  SOURCE = "source",
  DEST = "dest",
}

export function AssetSelect({
  assetCode,
  issuerKey,
}: {
  assetCode: string;
  issuerKey: string;
}) {
  const { assetIcons } = useSelector(transactionSubmissionSelector);

  const handleSelectAsset = () => {
    navigateTo(
      ROUTES.manageAssets,
      `?${ASSET_SELECT.QUERY_PARAM}=${ASSET_SELECT.SOURCE}`,
    );
  };

  return (
    <div className="AssetSelect__wrapper" onClick={handleSelectAsset}>
      <div className="AssetSelect__content">
        <div className="AssetSelect__content__left">
          <AssetIcon
            assetIcons={assetIcons}
            code={assetCode}
            issuerKey={issuerKey}
          />
          <span className="AssetSelect__medium-copy">{assetCode}</span>
        </div>
        <div className="AssetSelect__content__right">
          <Icon.ChevronDown />
        </div>
      </div>
    </div>
  );
}

export function PathPayAssetSelect({
  source,
  assetCode,
  issuerKey,
  balance,
}: {
  source: boolean;
  assetCode: string;
  issuerKey: string;
  balance: string;
}) {
  const { assetIcons } = useSelector(transactionSubmissionSelector);

  const handleSelectAsset = () => {
    if (source) {
      navigateTo(
        ROUTES.manageAssets,
        `?${ASSET_SELECT.QUERY_PARAM}=${ASSET_SELECT.SOURCE}`,
      );
      return;
    }
    navigateTo(
      ROUTES.manageAssets,
      `?${ASSET_SELECT.QUERY_PARAM}=${ASSET_SELECT.DEST}`,
    );
  };

  const truncateLongAssetCode = (code: string) => {
    if (code.length >= 5) {
      return `${code.slice(0, 5)}...`;
    }
    return code;
  };

  return (
    <div
      onClick={handleSelectAsset}
      className="AssetSelect__wrapper AssetSelect__wrapper--path-pay"
    >
      <div className="AssetSelect__content">
        <div className="AssetSelect__content__left">
          <span className="AssetSelect__light-copy AssetSelect__light-copy__label">
            {source ? "From" : "To"}
          </span>
          <AssetIcon
            assetIcons={assetIcons}
            code={assetCode}
            issuerKey={issuerKey}
          />
          <span className="AssetSelect__medium-copy">
            {truncateLongAssetCode(assetCode)}
          </span>{" "}
          <Icon.ChevronDown />
        </div>
        <div className="AssetSelect__content__right">
          <span className="AssetSelect__light-copy">
            {balance && balance !== "0" ? balance : ""}{" "}
            {truncateLongAssetCode(assetCode)}
          </span>
        </div>
      </div>
    </div>
  );
}
