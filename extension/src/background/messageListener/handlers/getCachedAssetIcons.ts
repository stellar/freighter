import { GetCachedAssetIconMessage } from "@shared/api/types/message-request";
import { readAssetIconCache } from "background/helpers/assetIconCache";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const getCachedAssetIcon = async ({
  request,
  localStore,
}: {
  request: GetCachedAssetIconMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetCanonical } = request;
  const icons = await readAssetIconCache(localStore);

  return {
    iconUrl: icons[assetCanonical] || "",
  };
};
