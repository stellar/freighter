import { NetworkDetails } from "@shared/constants/stellar";
import {
  AssetsLists,
  AssetListReponseItem,
  AssetListResponse,
} from "@shared/constants/soroban/asset-list";
import { getNativeContractDetails } from "popup/helpers/searchAsset";

import { schemaValidatedAssetList } from "@shared/api/helpers/token-list";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { getAssetLists } from "./searchAsset";

export const splitVerifiedAssetCurrency = async ({
  networkDetails,
  assets,
  assetsListsDetails,
  cachedAssetLists,
}: {
  networkDetails: NetworkDetails;
  assets: ManageAssetCurrency[];
  assetsListsDetails: AssetsLists;
  cachedAssetLists?: AssetListResponse[];
}) => {
  const settledResponses = await getAssetLists({
    assetsListsDetails,
    networkDetails,
    cachedAssetLists,
  });
  const nativeContractDetails = getNativeContractDetails(networkDetails);

  const validatedAssets = [] as AssetListReponseItem[];
  for (const response of settledResponses) {
    if (response.status === "fulfilled") {
      // confirm that this list still adheres to the agreed upon schema
      const validatedList = await schemaValidatedAssetList(response.value);
      validatedAssets.push(...validatedList.assets);
    }
  }
  // make a unique set of contract IDs and issuers
  const verifiedIds = new Set<string>();
  for (const validAsset of validatedAssets) {
    if (validAsset.contract && !verifiedIds.has(validAsset.contract)) {
      verifiedIds.add(validAsset.contract);
    }
    if (!verifiedIds.has(validAsset.issuer)) {
      verifiedIds.add(validAsset.issuer);
    }
  }

  verifiedIds.add(nativeContractDetails.contract);

  const [verifiedAssets, unverifiedAssets] = assets.reduce<
    [typeof assets, typeof assets]
  >(
    ([inVerifiedList, notInVerifiedList], item) => {
      if (item.issuer && verifiedIds.has(item.issuer)) {
        inVerifiedList.push(item);
        return [inVerifiedList, notInVerifiedList];
      }

      if (item.contract && verifiedIds.has(item.contract)) {
        inVerifiedList.push(item);
        return [inVerifiedList, notInVerifiedList];
      }

      notInVerifiedList.push(item);
      return [inVerifiedList, notInVerifiedList];
    },
    [[], []],
  );

  return {
    verifiedAssets,
    unverifiedAssets,
  };
};

interface GetAssetListsForAssetParams {
  asset: ManageAssetCurrency;
  assetsListsDetails: AssetsLists;
  networkDetails: NetworkDetails;
  cachedAssetLists?: AssetListResponse[];
}

/**
 * True when `asset` and `item` name the same asset.
 *
 * Both halves of an identity are optional on these records, so each comparison
 * requires its own side to actually be present — two absent values are not a
 * match.
 */
export const assetMatchesListItem = (
  asset: { issuer?: string; contract?: string },
  item: { issuer?: string; contract?: string },
): boolean =>
  (!!asset.issuer && asset.issuer === item.issuer) ||
  (!!asset.contract && asset.contract === item.contract);

export const getAssetListsForAsset = async ({
  asset,
  assetsListsDetails,
  networkDetails,
  cachedAssetLists,
}: GetAssetListsForAssetParams) => {
  const settledResponses = await getAssetLists({
    assetsListsDetails,
    networkDetails,
    cachedAssetLists,
  });

  const validatedAssets = {} as Record<string, AssetListReponseItem[]>;
  for (const response of settledResponses) {
    if (response.status === "fulfilled") {
      // confirm that this list still adheres to the agreed upon schema
      const validatedList = await schemaValidatedAssetList(response.value);
      validatedAssets[response.value.name] = validatedList.assets;
    }
  }

  return Object.entries(validatedAssets)
    .filter(([_, items]) =>
      items.some((item) => assetMatchesListItem(asset, item)),
    )
    .map(([name]) => name);
};
