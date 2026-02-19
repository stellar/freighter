import React from "react";
import { Asset } from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";
import { isMainnet } from "helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { CollectibleInfoImage } from "popup/components/account/CollectibleInfo";

interface SendAssetProps {
  isCollectible: boolean;
  collectibleData: {
    collectionName: string;
    collectionAddress: string;
    tokenId: number | null;
    name: string;
    image: string;
  };
  assetIcons: { [key: string]: string | null };
  asset: Asset | { code: string; issuer: string };
  assetIcon: string | null;
  sendAmount: string;
  networkDetails: NetworkDetails;
  sendPriceUsd: string | null;
}

export const SendAsset: React.FC<SendAssetProps> = ({
  isCollectible,
  collectibleData,
  assetIcons,
  asset,
  assetIcon,
  sendAmount,
  networkDetails,
  sendPriceUsd,
}) => {
  if (isCollectible) {
    return (
      <>
        <div className="ReviewTx__SendAsset__Collectible">
          <CollectibleInfoImage
            image={collectibleData.image}
            name={collectibleData.name}
            isSmall
          />
        </div>
        <div
          className="ReviewTx__SendAssetDetails"
          data-testid="review-tx-send-amount"
        >
          <div className="ReviewTx__SendAsset__Collectible__label">
            <div
              className="ReviewTx__SendAsset__Collectible__label__name"
              data-testid="review-tx-send-asset-collectible-name"
            >
              {collectibleData.name}
            </div>
            <div
              className="ReviewTx__SendAsset__Collectible__label__id"
              data-testid="review-tx-send-asset-collectible-collection-name"
            >
              {collectibleData.collectionName} #{collectibleData.tokenId}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AssetIcon
        assetIcons={assetIcons}
        code={asset.code}
        issuerKey={asset.issuer}
        icon={assetIcon}
        isSuspicious={false}
      />
      <div
        className="ReviewTx__SendAssetDetails"
        data-testid="review-tx-send-amount"
      >
        <span>
          {sendAmount} {asset.code}
        </span>
        {isMainnet(networkDetails) && sendPriceUsd && (
          <span className="ReviewTx__SendAssetDetails__price">
            {`$${sendPriceUsd}`}
          </span>
        )}
      </div>
    </>
  );
};
