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

const SEP_0042_SCHEMA_URL =
  "https://raw.githubusercontent.com/orbitlens/stellar-protocol/sep-0042-token-lists/contents/sep-0042/assetlist.schema.json";

// Per-asset fields we treat as best-effort: when one of these fails validation
// we strip just that field and keep the rest of the asset. Matches error paths
// like "instance.assets[3].contract".
const STRIPPABLE_ASSET_FIELD =
  /^instance\.assets\[(\d+)\]\.(name|contract|org)$/;

// Relax the upstream SEP-0042 schema to the subset of rules Freighter needs so a
// single odd field doesn't void an otherwise-useful list:
//   - allow "mainnet" as a network value (in addition to public/testnet)
//   - allow an optional third version segment (e.g. "1.4.4")
//   - make name/org optional (contract is already optional via the schema's
//     "contract OR code+issuer" anyOf)
// Operates on a clone so the caller's schema object is never mutated.
const relaxAssetListSchema = (rawSchema: unknown) => {
  const schema = JSON.parse(JSON.stringify(rawSchema));
  const properties = schema?.properties ?? {};

  if (
    Array.isArray(properties.network?.enum) &&
    !properties.network.enum.includes("mainnet")
  ) {
    properties.network.enum.push("mainnet");
  }

  if (typeof properties.version?.pattern === "string") {
    properties.version.pattern = "^\\d{1,4}\\.\\d{1,4}(\\.\\d{1,4})?$";
  }

  const assetItems = properties.assets?.items;
  if (Array.isArray(assetItems?.required)) {
    assetItems.required = assetItems.required.filter(
      (field: string) => field !== "name" && field !== "org",
    );
  }

  return schema;
};

export const schemaValidatedAssetList = async (
  assetListJson: AssetListResponse,
): Promise<{
  assets: AssetListReponseItem[];
  errors: ValidationError[] | null;
}> => {
  let schemaRes;
  try {
    schemaRes = await fetch(SEP_0042_SCHEMA_URL);
  } catch (err) {
    captureException("Error fetching SEP-0042 JSON schema");
    return { assets: [] as AssetListReponseItem[], errors: null };
  }

  if (!schemaRes.ok) {
    captureException("Unable to fetch SEP-0042 JSON schema");
    return { assets: [] as AssetListReponseItem[], errors: null };
  }

  const schema = relaxAssetListSchema(await schemaRes.json());

  // Validate against a copy so we never mutate the (possibly cached) source list.
  const candidate = {
    ...assetListJson,
    assets: (assetListJson.assets || []).map((asset) => ({ ...asset })),
  };

  // First pass: drop the individual name/contract/org fields that fail
  // validation, keeping the rest of each asset intact.
  const firstPass = validate(candidate, schema);
  for (const error of firstPass.errors) {
    const match = error.property.match(STRIPPABLE_ASSET_FIELD);
    if (match) {
      const [, index, field] = match;
      delete candidate.assets[Number(index)][
        field as "name" | "contract" | "org"
      ];
    }
  }

  // Second pass: anything still invalid is a rule we don't relax, so reject the
  // whole list as before.
  const finalPass = validate(candidate, schema);
  if (finalPass.errors.length) {
    console.warn(
      `Rejecting asset list from provider "${assetListJson.provider || "Unknown Provider"}": failed SEP-0042 schema validation`,
      finalPass.errors,
    );
    return { assets: [] as AssetListReponseItem[], errors: finalPass.errors };
  }

  return { assets: candidate.assets, errors: null };
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
  if (cachedAssetLists?.length) {
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
          return null;
        }

        if (!res || !res.ok) {
          const statusText = res?.status ? ` (${res.status})` : "";
          captureException(`Failed to load asset list: ${url}${statusText}`);
          return null;
        }

        try {
          return await res.json();
        } catch (e) {
          captureException(
            `Failed to parse asset list JSON: ${url} - ${JSON.stringify(e)}`,
          );
          return null;
        }
      };

      promiseArr.push(fetchAndParse());
    }
  }

  const promiseRes =
    await Promise.allSettled<Promise<AssetListResponse | null>>(promiseArr);

  const assetListsData = [];
  for (const p of promiseRes) {
    if (p.status === "fulfilled" && p.value) {
      assetListsData.push(p.value);
    }
  }
  return assetListsData;
};
