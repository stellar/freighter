import {
  AssetListReponseItem,
  AssetsLists,
} from "@shared/constants/soroban/asset-list";
import { NetworkDetails } from "@shared/constants/stellar";
import { getCombinedAssetListData } from "./token-list";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

export const getIconFromTokenLists = async ({
  networkDetails,
  issuerId,
  contractId,
  code,
  assetsLists,
}: {
  networkDetails: NetworkDetails;
  issuerId?: string;
  contractId?: string;
  code: string;
  assetsLists: AssetsLists;
}) => {
  const assetListsData = await getCombinedAssetListData({
    networkDetails,
    assetsLists,
  });

  let verifiedToken = {} as AssetListReponseItem;
  let canonicalAsset = undefined as string | undefined;
  for (const data of assetListsData) {
    const list = data.assets;
    if (list) {
      for (const record of list) {
        if (contractId) {
          const regex = new RegExp(contractId, "i");
          if (record.contract && record.contract.match(regex) && record.icon) {
            verifiedToken = record;
            canonicalAsset = getCanonicalFromAsset(code, contractId);
            break;
          }
        }

        if (
          issuerId &&
          record.issuer &&
          record.issuer === issuerId &&
          record.icon
        ) {
          verifiedToken = record;
          canonicalAsset = getCanonicalFromAsset(code, issuerId);
          break;
        }
      }
    }
  }

  return {
    icon: verifiedToken?.icon,
    canonicalAsset,
  };
};
