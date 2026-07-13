import { useEffect, useRef } from "react";
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

  // currentAssetRef lets the param handlers below read the latest selected
  // asset without putting transactionData.asset in the effect deps (which would
  // re-run the effect on every asset change).
  const currentAssetRef = useRef(transactionData.asset);
  currentAssetRef.current = transactionData.asset;

  // Tracks the last location.search the effect actually pre-populated from, so
  // re-runs triggered by other dependencies (e.g. the collections cache
  // refreshing after a successful send) don't re-apply the URL params and
  // revert an asset/destination the user changed mid-flow. (Fixes #2871.)
  const lastAppliedSearchRef = useRef<string | null>(null);

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

    // Only pre-populate destination/asset from the URL when location.search
    // itself changes (initial mount or a new deep link). Re-runs caused by
    // other dependencies must not re-apply the params and clobber what the user
    // picked mid-flow — the collectible block above still re-runs because it
    // depends on collections loading asynchronously. (Fixes #2871.)
    if (lastAppliedSearchRef.current === location.search) {
      return;
    }
    lastAppliedSearchRef.current = location.search;

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
        if (!currentAssetRef.current) {
          dispatch(saveAsset("native"));
          dispatch(saveIsCollectible(false));
          dispatch(saveIsToken(false));
        }
      }
    } else {
      // No asset param: keep current asset/flags when already selected.
      if (!currentAssetRef.current) {
        dispatch(saveAsset("native"));
        dispatch(saveIsCollectible(false));
        dispatch(saveIsToken(false));
      }
    }
    // currentAssetRef intentionally excluded — see ref comment above.
  }, [dispatch, location.search, collectibleData, networkDetails, publicKey]);
}
