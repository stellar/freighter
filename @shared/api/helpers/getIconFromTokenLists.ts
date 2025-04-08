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
import { isContractId } from "./soroban";

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
}: {
  networkDetails: NetworkDetails;
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

  const assetListsData = [];
  for (const p of promiseRes) {
    if (p.status === "fulfilled") {
      assetListsData.push(p.value);
    }
  }
  return assetListsData;
};

export const getIconFromTokenLists = async ({
  networkDetails,
  id,
  assetsLists,
}: {
  networkDetails: NetworkDetails;
  id: string; // G or C address
  assetsLists: AssetsLists;
}) => {
  const assetListsData = await getCombinedAssetListData({
    networkDetails,
    assetsLists,
  });

  let verifiedToken = {} as AssetListReponseItem;
  for (const data of assetListsData) {
    const list = data.assets;
    if (list) {
      for (const record of list) {
        if (isContractId(id)) {
          const regex = new RegExp(id, "i");
          if (record.contract && record.contract.match(regex) && record.icon) {
            verifiedToken = record;
            break;
          }
        }

        if (record.issuer && record.issuer === id && record.icon) {
          verifiedToken = record;
          break;
        }
      }
    }
  }

  return verifiedToken.icon;
};
