import React from "react";
import { Icon } from "@stellar/design-system";
import BigNumber from "bignumber.js";

import { AssetIcons, SoroswapToken } from "@shared/api/types";
import { getAssetFromCanonical } from "helpers/stellar";
import { formatAmount } from "popup/helpers/formatters";
import { AssetIcon } from "../account/AccountAssets";

import "./styles.scss";

export const TwoAssetCard = ({
  sourceAssetIcons,
  sourceCanon,
  sourceAmount,
  destAssetIcons,
  destCanon,
  destAmount,
  isSourceAssetSuspicious,
  isDestAssetSuspicious,
  soroswapTokens,
}: {
  sourceAssetIcons: AssetIcons;
  sourceCanon: string;
  sourceAmount: string;
  destAssetIcons: AssetIcons;
  destCanon: string;
  destAmount: string;
  isSourceAssetSuspicious: boolean;
  isDestAssetSuspicious: boolean;
  soroswapTokens: SoroswapToken[];
}) => {
  const sourceAsset = getAssetFromCanonical(sourceCanon);
  const destAsset = getAssetFromCanonical(destCanon);

  return (
    <div className="TwoAssetCard">
      <div className="TwoAssetCard__row">
        <div className="TwoAssetCard__row__left">
          <AssetIcon
            assetIcons={sourceAssetIcons}
            code={sourceAsset.code}
            issuerKey={sourceAsset.issuer}
            isSuspicious={isSourceAssetSuspicious}
            soroswapTokens={soroswapTokens}
          />
          {sourceAsset.code}
        </div>
        <div
          className="TwoAssetCard__row__right"
          data-testid="TransactionDetailsAssetSource"
        >
          {formatAmount(sourceAmount)} {sourceAsset.code}
        </div>
      </div>
      <div className="TwoAssetCard__arrow-icon">
        <Icon.ArrowDown />
      </div>
      <div className="TwoAssetCard__row">
        <div className="TwoAssetCard__row__left">
          <AssetIcon
            assetIcons={destAssetIcons}
            code={destAsset.code}
            issuerKey={destAsset.issuer}
            isSuspicious={isDestAssetSuspicious}
            soroswapTokens={soroswapTokens}
          />
          {destAsset.code}
        </div>
        <div
          className="TwoAssetCard__row__right"
          data-testid="TransactionDetailsAssetDestination"
        >
          {formatAmount(new BigNumber(destAmount).toFixed())} {destAsset.code}
        </div>
      </div>
    </div>
  );
};
