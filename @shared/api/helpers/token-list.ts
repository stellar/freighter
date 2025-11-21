import { captureException } from "@sentry/browser";
import { validate, ValidationError } from "jsonschema";

import {
  AssetListReponseItem,
  AssetListResponse,
  AssetsListKey,
  AssetsLists,
} from "@shared/constants/soroban/asset-list";
import {
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";

export const schemaValidatedAssetList = async (
  assetListJson: AssetListResponse,
): Promise<{
  assets: AssetListReponseItem[];
  errors: ValidationError[] | null;
}> => {
  let schemaRes;
  try {
    schemaRes = await fetch(
      "https://raw.githubusercontent.com/orbitlens/stellar-protocol/sep-0042-token-lists/contents/sep-0042/assetlist.schema.json",
    );
  } catch (err) {
    captureException("Error fetching SEP-0042 JSON schema");
    return { assets: [] as AssetListReponseItem[], errors: null };
  }

  if (!schemaRes.ok) {
    captureException("Unable to fetch SEP-0042 JSON schema");
    return { assets: [] as AssetListReponseItem[], errors: null };
  }

  const schemaResJson = await schemaRes?.json();

  // check against the SEP-0042 schema
  const validatedList = validate(assetListJson, schemaResJson);

  if (validatedList.errors.length) {
    return {
      assets: [] as AssetListReponseItem[],
      errors: validatedList.errors,
    };
  }

  return { assets: assetListJson.assets, errors: null };
};

export const getCombinedAssetListData = async ({
  networkDetails,
  assetsLists,
  cachedAssetLists,
}: {
  networkDetails: NetworkDetails;
  assetsLists: AssetsLists;
  cachedAssetLists?: AssetListResponse[];
}) => {
  // If cached asset lists are provided and not empty, use them instead of fetching
  if (!!cachedAssetLists?.length) {
    return cachedAssetLists;
  }

  let network = networkDetails.network;

  if (network === CUSTOM_NETWORK) {
    if (
      networkDetails.networkPassphrase ===
      MAINNET_NETWORK_DETAILS.networkPassphrase
    ) {
      network = MAINNET_NETWORK_DETAILS.network;
    }
    if (
      networkDetails.networkPassphrase ===
      TESTNET_NETWORK_DETAILS.networkPassphrase
    ) {
      network = TESTNET_NETWORK_DETAILS.network;
    }
  }

  const networkLists = assetsLists[network as AssetsListKey] || [];
  const assetListsData = [];

  // Fetch sequentially to avoid parallel requests
  for (const networkList of networkLists) {
    const { url = "", isEnabled } = networkList;

    if (isEnabled) {
      try {
        const res = await fetch(url);

        if (!res || !res.ok) {
          const statusText = res?.status ? ` (${res.status})` : "";
          captureException(`Failed to load asset list: ${url}${statusText}`);
          continue;
        }

        try {
          const data = await res.json();
          if (data) {
            assetListsData.push(data);
          }
        } catch (e) {
          captureException(
            `Failed to parse asset list JSON: ${url} - ${JSON.stringify(e)}`,
          );
        }
      } catch (e) {
        captureException(`Failed to load asset list: ${url}`);
      }
    }
  }

  return assetListsData;
};
