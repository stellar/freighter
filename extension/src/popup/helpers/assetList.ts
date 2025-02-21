import { NetworkDetails } from "@shared/constants/stellar";
import {
  AssetsLists,
  AssetListReponseItem,
} from "@shared/constants/soroban/asset-list";

import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { getAssetLists, schemaValidatedAssetList } from "./searchAsset";

export const splitVerifiedAssetCurrency = async ({
  networkDetails,
  assets,
  assetsListsDetails,
}: {
  networkDetails: NetworkDetails;
  assets: ManageAssetCurrency[];
  assetsListsDetails: AssetsLists;
}) => {
  const settledResponses = await getAssetLists({
    assetsListsDetails,
    networkDetails,
  });

  // eslint-disable-next-line no-restricted-syntax
  const validatedAssets = [] as AssetListReponseItem[];
  // eslint-disable-next-line no-restricted-syntax
  for (const response of settledResponses) {
    if (response.status === "fulfilled") {
      // confirm that this list still adheres to the agreed upon schema
      const validatedList = await schemaValidatedAssetList(response.value);
      validatedAssets.push(...validatedList.assets);
    }
  }
  // make a unique set of contract IDs and issuers
  const verifiedIds = new Set<string>();
  // eslint-disable-next-line no-restricted-syntax
  for (const validAsset of validatedAssets) {
    if (!verifiedIds.has(validAsset.contract)) {
      verifiedIds.add(validAsset.contract);
    }
    if (!verifiedIds.has(validAsset.issuer)) {
      verifiedIds.add(validAsset.issuer);
    }
  }

  const [verifiedAssets, unverifiedAssets] = assets.reduce<
    [typeof assets, typeof assets]
  >(
    ([inC, notInC], item) => {
      if (item.issuer && verifiedIds.has(item.issuer)) {
        inC.push(item);
        return [inC, notInC];
      }

      if (item.contract && verifiedIds.has(item.contract)) {
        inC.push(item);
        return [inC, notInC];
      }

      notInC.push(item);
      return [inC, notInC];
    },
    [[], []],
  );

  return {
    verifiedAssets,
    unverifiedAssets,
  };
};

export const getAssetListsForAsset = async ({
  asset,
  assetsListsDetails,
  networkDetails,
}: {
  asset: ManageAssetCurrency;
  assetsListsDetails: AssetsLists;
  networkDetails: NetworkDetails;
}) => {
  const settledResponses = await getAssetLists({
    assetsListsDetails,
    networkDetails,
  });

  // eslint-disable-next-line no-restricted-syntax
  const validatedAssets = {} as Record<string, AssetListReponseItem[]>;
  // eslint-disable-next-line no-restricted-syntax
  for (const response of settledResponses) {
    if (response.status === "fulfilled") {
      // confirm that this list still adheres to the agreed upon schema
      const validatedList = await schemaValidatedAssetList(response.value);
      validatedAssets[response.value.name] = validatedList.assets;
    }
  }

  return Object.entries(validatedAssets)
    .filter(([_, items]) =>
      items.some(
        ({ issuer, contract }) =>
          asset.issuer === issuer || asset.contract === contract,
      ),
    )
    .map(([name]) => name);
};
