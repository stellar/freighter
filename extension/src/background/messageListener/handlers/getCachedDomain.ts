import { GetCachedDomainMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_DOMAINS_ID } from "constants/localStorageTypes";

export const getCachedAssetDomain = async ({
  request,
  localStore,
}: {
  request: GetCachedDomainMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetCanonical } = request;

  let assetDomainCache =
    (await localStore.getItem(CACHED_ASSET_DOMAINS_ID)) || {};

  // works around a 3.0.0 migration issue
  if (typeof assetDomainCache === "string") {
    assetDomainCache = JSON.parse(assetDomainCache);
  }

  return {
    iconUrl: assetDomainCache[assetCanonical] || "",
  };
};
