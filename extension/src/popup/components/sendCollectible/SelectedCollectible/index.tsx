import React from "react";
import { useSelector } from "react-redux";

import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { CollectibleInfo } from "popup/components/account/CollectibleInfo";
import { AddressTile } from "popup/components/send/AddressTile";

import "./styles.scss";

export const SelectedCollectible = ({
  goToChooseDest,
}: {
  goToChooseDest: () => void;
}) => {
  const { transactionData } = useSelector(transactionSubmissionSelector);
  const { collectibleData, destination, federationAddress } = transactionData;
  const { collectionName, tokenId, name, image } = collectibleData;
  return (
    <div className="SelectedCollectible" data-testid="SelectedCollectible">
      <div className="SelectedCollectible__address-tile">
        <AddressTile
          address={destination}
          federationAddress={federationAddress}
          onClick={goToChooseDest}
        />
      </div>

      <CollectibleInfo
        collectionName={collectionName}
        tokenId={tokenId?.toString() || ""}
        name={name}
        image={image}
        dataTestIdBase="SelectedCollectible"
      />
    </div>
  );
};
