import { NetworkDetails } from "@shared/constants/stellar";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { isContractId } from "@shared/api/helpers/soroban";
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
  // make a unique set of the contract IDs and code:issuer pairs the lists vouch for
  const verifiedIds = new Set<string>();
  for (const validAsset of validatedAssets) {
    getAssetIdentities(validAsset).forEach((id) => verifiedIds.add(id));
  }

  verifiedIds.add(nativeContractDetails.contract);

  const [verifiedAssets, unverifiedAssets] = assets.reduce<
    [typeof assets, typeof assets]
  >(
    ([inVerifiedList, notInVerifiedList], item) => {
      if (getAssetIdentities(item).some((id) => verifiedIds.has(id))) {
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
 * The identities an asset (or an asset list entry) is known by: its contract
 * id, and for a classic asset its code:issuer pair. A contract id in the
 * issuer field is a contract identity too, matched for any code.
 *
 * A classic asset is the pair (code, issuer), so the issuer alone is never an
 * identity: an issuer can mint any number of codes, and a list that vouches
 * for one of them does not vouch for the others. Codes are case-sensitive, so
 * USDE and USDe from the same issuer are different assets.
 */
export const getAssetIdentities = (asset: {
  code?: string;
  issuer?: string;
  contract?: string;
}): string[] => {
  const identities = [] as string[];
  if (asset.contract) {
    identities.push(asset.contract);
  }
  if (isContractId(asset.issuer)) {
    identities.push(asset.issuer!);
  } else if (asset.code && asset.issuer) {
    identities.push(getCanonicalFromAsset(asset.code, asset.issuer));
  }
  return identities;
};

/**
 * True when `asset` and `item` share a contract id, or share both code and
 * issuer.
 *
 * Both halves of an identity are optional on these records, so each comparison
 * requires its own side to actually be present — two absent values are not a
 * match.
 */
export const assetMatchesListItem = (
  asset: { code?: string; issuer?: string; contract?: string },
  item: { code?: string; issuer?: string; contract?: string },
): boolean => {
  const itemIdentities = getAssetIdentities(item);
  return getAssetIdentities(asset).some((id) => itemIdentities.includes(id));
};

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
