import { StellarTomlResolver } from "stellar-sdk";

import { sendMessageToBackground } from "./extensionMessaging";
import { stellarSdkServer } from "./stellarSdkServer";
import { SERVICE_TYPES } from "../../constants/services";
import { NetworkDetails } from "../../constants/stellar";

/* 
This runs a slightly convoluted process to find an icon's url. 
It's not practical to manually find every possible icon png for every possible asset that exists/can exist 
and save a copy into this repo. Nor is it practical to manually create some sort of list of all icon url's and 
have to push releases to update it.

Ideally, this will be replaced by a backend server that does all this work for us in the near future.

Until then, the very first time a user loads a non native asset in the UI, we will check that asset's issuer public key
account info to find their listed website. Using the website, we attempt to look at their stellar.toml file to
see if it provides an icon url. 

So, on this very first time, this requires 3 roundtrips for an image: 
- first to Horizon to get issuer info, 
- second to the issuer toml file to get the icon url
- third to get the actual image data from the url

If any of that fails, we move on with no image and fallback to a generic bullet.

If we successfully do that, we save the resulting url in our localStorage cache.

So, any subsequent attempts to load the asset, it requires only 1 roundtrip for an image
- first, just get the image from the url we already have saved for that asset and load it
*/
export const getIconUrlFromIssuer = async ({
  key,
  code,
  networkDetails,
}: {
  key: string;
  code: string;
  networkDetails: NetworkDetails;
}) => {
  let iconUrl = "";
  let response;

  try {
    /* First, check our localStorage cache in Background to see if we've found this url before */
    ({ iconUrl } = await sendMessageToBackground({
      assetCanonical: `${code}:${key}`,
      type: SERVICE_TYPES.GET_CACHED_ASSET_ICON,
    }));
    if (iconUrl) {
      /* If we had the url stored in cache, simply return it. We're done. */
      return iconUrl;
    }
  } catch (e) {
    console.error(e);
  }

  try {
    /* Otherwise, 1. load their account from the API */
    const { networkUrl } = networkDetails;
    const server = stellarSdkServer(networkUrl);

    response = await server.loadAccount(key);
  } catch (e) {
    return iconUrl;
  }

  const { home_domain: homeDomain } = response;
  let toml;

  try {
    /* 2. Use their domain from their API account and use it attempt to load their stellar.toml */
    toml = await StellarTomlResolver.resolve(homeDomain);
  } catch (e) {
    console.error(e);
    return iconUrl;
  }

  if (toml.CURRENCIES) {
    /* If we find some currencies listed, check to see if they have the currency we're looking for listed */
    toml.CURRENCIES.every(
      async ({
        code: currencyCode,
        image,
      }: {
        code: string;
        image: string;
      }) => {
        if (currencyCode === code && image) {
          /* We found the currency listing in the toml. 3. Get the image url from it */
          iconUrl = image;
          /* And also save into the cache to prevent having to do this process again */
          await sendMessageToBackground({
            assetCanonical: `${code}:${key}`,
            iconUrl,
            type: SERVICE_TYPES.CACHE_ASSET_ICON,
          });
          return false;
        }
        return true;
      },
    );
  }
  /* Return the icon url to the UI, if we found it */
  return iconUrl;
};
