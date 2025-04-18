import { CacheDomainMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_DOMAINS_ID } from "constants/localStorageTypes";

export const cacheAssetDomain = async ({
  request,
  localStore,
}: {
  request: CacheDomainMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetCanonical, assetDomain } = request;

  let assetDomainCache =
    (await localStore.getItem(CACHED_ASSET_DOMAINS_ID)) || {};

  // works around a 3.0.0 migration issue
  if (typeof assetDomainCache === "string") {
    assetDomainCache = JSON.parse(assetDomainCache);
  }

  assetDomainCache[assetCanonical] = assetDomain;
  await localStore.setItem(CACHED_ASSET_DOMAINS_ID, assetDomainCache);
};
