import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

import { sendMessageToBackground } from "./extensionMessaging";
import { SERVICE_TYPES } from "../../constants/services";

/**
 * The icon of the first list (in the user's priority order) that carries the
 * asset, matched by contract ID or by code and issuer.
 */
export const findTokenListIcon = ({
  issuerId,
  contractId,
  code,
  assetsListsData,
}: {
  issuerId?: string;
  contractId?: string;
  code: string;
  assetsListsData: AssetListResponse[];
}) => {
  for (const data of assetsListsData) {
    for (const record of data.assets ?? []) {
      if (contractId) {
        const regex = new RegExp(contractId, "i");
        if (record.contract && record.contract.match(regex) && record.icon) {
          return {
            icon: record.icon,
            canonicalAsset: getCanonicalFromAsset(code, contractId),
          };
        }
      }

      if (
        issuerId &&
        record.issuer &&
        record.issuer === issuerId &&
        record.code === code &&
        record.icon
      ) {
        return {
          icon: record.icon,
          canonicalAsset: getCanonicalFromAsset(code, issuerId),
        };
      }
    }
  }
  return { icon: undefined, canonicalAsset: undefined };
};

export const getIconFromTokenLists = async ({
  issuerId,
  contractId,
  code,
  assetsListsData,
}: {
  issuerId?: string;
  contractId?: string;
  code: string;
  assetsListsData: AssetListResponse[];
}) => {
  const found = findTokenListIcon({
    issuerId,
    contractId,
    code,
    assetsListsData,
  });

  if (found.icon) {
    await sendMessageToBackground({
      activePublicKey: null,
      assetCanonical: `${code}:${contractId || issuerId}`,
      iconUrl: found.icon,
      type: SERVICE_TYPES.CACHE_ASSET_ICON,
    });
  }

  return found;
};
