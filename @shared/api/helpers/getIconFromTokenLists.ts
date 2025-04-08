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

export const getIconFromTokenLists = async ({
  networkDetails,
  contractId,
  assetsLists,
}: {
  networkDetails: NetworkDetails;
  contractId: string;
  assetsLists: AssetsLists;
}) => {
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

  const networkLists = assetsLists[network as AssetsListKey];
  const promiseArr = [];
  for (const networkList of networkLists) {
    const { url = "", isEnabled } = networkList;

    if (isEnabled) {
      const fetchAndParse = async () => {
        let res;
        try {
          res = await fetch(url);
        } catch (e) {
          captureException(`Failed to load asset list: ${url}`);
        }

        return res?.json();
      };

      promiseArr.push(fetchAndParse());
    }
  }

  const promiseRes =
    await Promise.allSettled<Promise<AssetListResponse>>(promiseArr);

  let verifiedToken = {} as AssetListReponseItem;

  for (const r of promiseRes) {
    if (r.status === "fulfilled") {
      // confirm that this list still adheres to the agreed upon schema
      const validatedList = await schemaValidatedAssetList(r.value);
      const list = validatedList.assets;
      if (list) {
        for (const record of list) {
          const regex = new RegExp(contractId, "i");
          if (record.contract && record.contract.match(regex) && record.icon) {
            verifiedToken = record;
            break;
          }
        }
      }
    }
  }

  return verifiedToken.icon;
};
