import { GetCachedAssetIconMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";

export const getCachedAssetIcon = async ({
  request,
  localStore,
}: {
  request: GetCachedAssetIconMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetCanonical } = request;

  const assetIconCache =
    (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {};

  return {
    iconUrl: assetIconCache[assetCanonical] || "",
  };
};
