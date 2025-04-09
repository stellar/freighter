import {
  AssetListReponseItem,
  AssetsLists,
} from "@shared/constants/soroban/asset-list";
import { NetworkDetails } from "@shared/constants/stellar";
import { isContractId } from "./soroban";
import { getCombinedAssetListData } from "./token-list";

export const getIconFromTokenLists = async ({
  networkDetails,
  id,
  assetsLists,
}: {
  networkDetails: NetworkDetails;
  id: string; // G or C address
  assetsLists: AssetsLists;
}) => {
  const assetListsData = await getCombinedAssetListData({
    networkDetails,
    assetsLists,
  });

  let verifiedToken = {} as AssetListReponseItem;
  for (const data of assetListsData) {
    const list = data.assets;
    if (list) {
      for (const record of list) {
        if (isContractId(id)) {
          const regex = new RegExp(id, "i");
          if (record.contract && record.contract.match(regex) && record.icon) {
            verifiedToken = record;
            break;
          }
        }

        if (record.issuer && record.issuer === id && record.icon) {
          verifiedToken = record;
          break;
        }
      }
    }
  }

  return verifiedToken?.icon;
};
