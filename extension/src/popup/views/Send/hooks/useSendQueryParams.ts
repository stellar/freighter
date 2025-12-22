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

  return foundCollection?.collection?.collectibles.find(
    (collectible) => collectible.tokenId === tokenId,
  );
};

export function useSendQueryParams() {
  const location = useLocation();
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const collectibleData = useSelector(collectionsSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const { asset: srcAsset } = submission.transactionData;

  useEffect(
    () => {
      const params = new URLSearchParams(location.search);
      const destinationParam = params.get("destination");
      const assetParam = params.get("asset");
      const collectionAddressParam = params.get("collection_address");
      const collectibleTokenIdParam = params.get("collectible_token_id");

      if (collectionAddressParam && collectibleTokenIdParam) {
        const collectibleata = findCollectibleData({
          collectionAddress: collectionAddressParam,
          tokenId: collectibleTokenIdParam,
          collections:
            collectibleData?.[networkDetails.network]?.[publicKey] || [],
        });

        dispatch(saveIsCollectible(true));
        dispatch(
          saveCollectibleData({
            collectionAddress: collectionAddressParam,
            tokenId: Number(collectibleTokenIdParam),
            name: collectibleata?.metadata?.name || "",
            collectionName: collectibleata?.collectionName || "",
            image: collectibleata?.metadata?.image || "",
          }),
        );
        return; // stop the execution of the hook as we are dealing with a collectible, not a token
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
          getAssetFromCanonical(assetParam);
          dispatch(saveAsset(assetParam));
        } catch {
          // Invalid asset param, ignore and use default
          if (!srcAsset) {
            dispatch(saveAsset("native"));
          }
        }
      } else if (!srcAsset) {
        // Set default asset to native if not already set
        dispatch(saveAsset("native"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, location.search, collectibleData, networkDetails, publicKey],
  );
}
