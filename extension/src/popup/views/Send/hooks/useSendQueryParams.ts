import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { StrKey } from "stellar-sdk";

import {
  saveAsset,
  saveCollectibleData,
  saveDestination,
  saveFederationAddress,
  saveIsCollectible,
  saveIsToken,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { collectionsSelector } from "popup/ducks/cache";
import { isContractId } from "popup/helpers/soroban";
import { getAssetFromCanonical } from "helpers/stellar";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { Collection } from "@shared/api/types";

const findCollectibleData = ({
  collectionAddress,
  tokenId,
  collections,
}: {
  collectionAddress: string;
  tokenId: string;
  collections: Collection[];
}) => {
  if (!collections) {
    return null;
  }

  const foundCollection = collections.find(
    (collection) => collection.collection?.address === collectionAddress,
  );

  return (
    foundCollection?.collection?.collectibles.find(
      (collectible) => collectible.tokenId === tokenId,
    ) || null
  );
};

export function useSendQueryParams() {
  const location = useLocation();
  const dispatch = useDispatch();
  const collectibleData = useSelector(collectionsSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { transactionData } = useSelector(transactionSubmissionSelector);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const destinationParam = params.get("destination");
    const assetParam = params.get("asset");
    const collectionAddressParam = params.get("collection_address");
    const collectibleTokenIdParam = params.get("collectible_token_id");

    if (collectionAddressParam && collectibleTokenIdParam) {
      const foundCollectible = findCollectibleData({
        collectionAddress: collectionAddressParam,
        tokenId: collectibleTokenIdParam,
        collections:
          collectibleData?.[networkDetails.network]?.[publicKey] || [],
      });

      if (foundCollectible) {
        dispatch(saveIsCollectible(true));
        dispatch(saveIsToken(false));
        dispatch(
          saveCollectibleData({
            collectionAddress: collectionAddressParam,
            tokenId: Number(collectibleTokenIdParam),
            name: foundCollectible?.metadata?.name || "",
            collectionName: foundCollectible?.collectionName || "",
            image: foundCollectible?.metadata?.image || "",
          }),
        );
        return; // stop the execution of the hook as we are dealing with a collectible, not a token
      }
    }

    // Pre-populate destination if provided and valid
    if (destinationParam) {
      const isValidDestination =
        StrKey.isValidEd25519PublicKey(destinationParam) ||
        isContractId(destinationParam);

      if (isValidDestination) {
        dispatch(saveDestination(destinationParam));
        dispatch(saveFederationAddress("")); // Reset federation address
      }
    }

    // Pre-populate asset if provided and valid, otherwise default to native
    if (assetParam) {
      try {
        const asset = getAssetFromCanonical(assetParam);
        dispatch(saveAsset(assetParam));
        dispatch(saveIsCollectible(false));
        dispatch(saveIsToken(isContractId(asset.issuer)));
      } catch {
        // Invalid asset param: keep current asset/flags when already selected.
        if (!transactionData.asset) {
          dispatch(saveAsset("native"));
          dispatch(saveIsCollectible(false));
          dispatch(saveIsToken(false));
        }
      }
    } else {
      // No asset param: keep current asset/flags when already selected.
      if (!transactionData.asset) {
        dispatch(saveAsset("native"));
        dispatch(saveIsCollectible(false));
        dispatch(saveIsToken(false));
      }
    }
  }, [
    dispatch,
    location.search,
    collectibleData,
    networkDetails,
    publicKey,
    transactionData.asset,
  ]);
}
