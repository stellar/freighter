import {
  AssetListReponseItem,
  AssetListResponse,
} from "@shared/constants/soroban/asset-list";
import { NetworkDetails } from "@shared/constants/stellar";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

import { sendMessageToBackground } from "./extensionMessaging";
import { SERVICE_TYPES } from "../../constants/services";

export const getIconFromTokenLists = async ({
  issuerId,
  contractId,
  code,
  assetsListsData,
}: {
  networkDetails: NetworkDetails;
  issuerId?: string;
  contractId?: string;
  code: string;
  assetsListsData: AssetListResponse[];
}) => {
  let verifiedToken = {} as AssetListReponseItem;
  let canonicalAsset = undefined as string | undefined;
  for (const data of assetsListsData) {
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

  if (verifiedToken?.icon) {
    await sendMessageToBackground({
      activePublicKey: null,
      assetCanonical: `${code}:${contractId || issuerId}`,
      iconUrl: verifiedToken?.icon,
      type: SERVICE_TYPES.CACHE_ASSET_ICON,
    });
  }

  return {
    icon: verifiedToken?.icon,
    canonicalAsset,
  };
};
