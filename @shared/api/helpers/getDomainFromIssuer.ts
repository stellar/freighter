import StellarSdk from "stellar-sdk";
import { sendMessageToBackground } from "./extensionMessaging";
import { SERVICE_TYPES } from "../../constants/services";
import { NetworkDetails } from "../../constants/stellar";

export const getDomainFromIssuer = async ({
  key,
  code,
  networkDetails,
}: {
  key: string;
  code: string;
  networkDetails: NetworkDetails;
}) => {
  let assetDomain = "";
  let response;

  try {
    /* First, check our localStorage cache in Background to see if we've found this url before */
    ({ assetDomain } = await sendMessageToBackground({
      assetCanonical: `${code}:${key}`,
      type: SERVICE_TYPES.GET_CACHED_ASSET_DOMAIN,
    }));
    if (assetDomain) {
      /* If we had the url stored in cache, simply return it. We're done. */
      return assetDomain;
    }
  } catch (e) {
    console.error(e);
  }

  try {
    /* Otherwise, 1. load their account from the API */
    const { networkUrl } = networkDetails;

    const server = new StellarSdk.Server(networkUrl);
    response = await server.loadAccount(key);
  } catch (e) {
    return assetDomain;
  }

  assetDomain = response.home_domain;

  /* And also save into the cache to prevent having to do this process again */
  await sendMessageToBackground({
    assetCanonical: `${code}:${key}`,
    assetDomain,
    type: SERVICE_TYPES.CACHE_ASSET_DOMAIN,
  });
  return assetDomain;
};
