import React from "react";
import { Asset } from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";
import { isMainnet } from "helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

interface SendDestinationProps {
  dstAsset?: {
    icon: string | null;
    canonical: string;
    priceUsd: string | null;
    amount: string;
  };
  dest: Asset | { code: string; issuer: string } | null;
  networkDetails: NetworkDetails;
  destination: string;
  truncatedDest: string;
}

export const SendDestination: React.FC<SendDestinationProps> = ({
  dstAsset,
  dest,
  networkDetails,
  destination,
  truncatedDest,
}) => {
  if (dstAsset && dest) {
    return (
      <>
        <AssetIcon
          assetIcons={
            dstAsset.canonical !== "native"
              ? { [dstAsset.canonical]: dstAsset.icon }
              : {}
          }
          code={dest.code}
          issuerKey={dest.issuer}
          icon={dstAsset.icon}
          isSuspicious={false}
        />
        <div className="ReviewTx__SendAssetDetails">
          <span>
            {dstAsset.amount} {dest.code}
          </span>
          {isMainnet(networkDetails) && dstAsset.priceUsd && (
            <span className="ReviewTx__SendAssetDetails__price">
              {`$${dstAsset.priceUsd}`}
            </span>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <IdenticonImg publicKey={destination} />
      <div
        className="ReviewTx__SendDestinationDetails"
        data-testid="review-tx-send-destination-address"
      >
        {truncatedDest}
      </div>
    </>
  );
};
