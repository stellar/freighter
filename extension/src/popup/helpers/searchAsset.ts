import { NetworkDetails, NETWORKS } from "@shared/constants/stellar";
import {
  AssetsLists,
  AssetsListKey,
  AssetListResponse,
  AssetListReponseItem,
} from "@shared/constants/soroban/asset-list";
import {
  getNativeContractId,
  isNativeAssetPair,
} from "@shared/helpers/assetIdentity";
import { isContractId } from "@shared/api/helpers/soroban";

import { getApiStellarExpertUrl } from "popup/helpers/account";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";

export const searchAsset = async ({
  asset,
  networkDetails,
  signal,
}: {
  asset: any;
  networkDetails: NetworkDetails;
  signal?: AbortSignal;
}) => {
  const res = await fetch(
    `${getApiStellarExpertUrl(networkDetails)}/asset?search=${asset}`,
    { signal },
  );
  // Surface backend outages instead of silently returning a non-records body:
  // throwing lets callers (e.g. the swap picker) fall back to held-only with a
  // "discovery unavailable" notice rather than rendering an empty result set.
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
};

export const getNativeContractDetails = (networkDetails: NetworkDetails) => {
  const NATIVE_CONTRACT_DEFAULTS = {
    code: "XLM",
    decimals: 7,
    domain: "https://stellar.org",
    icon: "",
    org: "",
  };

  // The native SAC address derives deterministically from the network
  // passphrase, which keeps every network correct by construction.
  const contract = getNativeContractId(networkDetails.networkPassphrase);

  switch (networkDetails.network as keyof typeof NETWORKS) {
    case NETWORKS.PUBLIC:
      return {
        ...NATIVE_CONTRACT_DEFAULTS,
        contract,
        issuer: "GDMTVHLWJTHSUDMZVVMXXH6VJHA2ZV3HNG5LYNAZ6RTWB7GISM6PGTUV",
      };
    default:
      return { ...NATIVE_CONTRACT_DEFAULTS, contract, issuer: "" };
  }
};

export type VerifiedTokenRecord = AssetListReponseItem & {
  verifiedLists: string[];
};

export const getAssetLists = async ({
  assetsListsDetails,
  networkDetails,
  cachedAssetLists,
}: {
  assetsListsDetails: AssetsLists;
  networkDetails: NetworkDetails;
  cachedAssetLists?: AssetListResponse[];
}) => {
  // If cached asset lists are provided and not empty, use them instead of fetching
  if (cachedAssetLists?.length) {
    // Convert cached data to the expected Promise.allSettled format
    return cachedAssetLists.map((assetList) => ({
      status: "fulfilled" as const,
      value: assetList,
    }));
  }

  const network = networkDetails.network;
  const assetsListsDetailsByNetwork =
    assetsListsDetails[network as AssetsListKey];

  const promiseArr = [];
  for (const { url, isEnabled } of assetsListsDetailsByNetwork) {
    if (!isEnabled) continue;

    const fetchAndParse = async (): Promise<AssetListResponse> => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return res.json();
    };

    promiseArr.push(fetchAndParse());
  }

  const promiseRes =
    await Promise.allSettled<Promise<AssetListResponse>>(promiseArr);

  return promiseRes;
};

export const getVerifiedTokens = async ({
  networkDetails,
  contractId,
  setIsSearching,
  assetsLists,
  cachedAssetLists,
}: {
  networkDetails: NetworkDetails;
  contractId: string;
  setIsSearching?: (isSearching: boolean) => void;
  assetsLists: AssetsLists;
  cachedAssetLists?: AssetListResponse[];
}) => {
  const assetListsData: AssetListResponse[] = await getCombinedAssetListData({
    networkDetails,
    assetsLists,
    cachedAssetLists,
  });
  const nativeContract = getNativeContractDetails(networkDetails);

  if (contractId === nativeContract.contract) {
    return [{ ...nativeContract, verifiedLists: [] }];
  }

  const verifiedTokens = [] as VerifiedTokenRecord[];
  let verifiedToken = {} as AssetListReponseItem;
  const verifiedLists: string[] = [];

  for (const data of assetListsData) {
    const list = data.assets;
    if (list) {
      for (const record of list) {
        const regex = new RegExp(contractId, "i");
        if (record.contract && record.contract.match(regex)) {
          verifiedToken = record;
          verifiedLists.push(data.name);
          break;
        }
      }
    }
  }

  if (Object.keys(verifiedToken).length) {
    verifiedTokens.push({
      ...verifiedToken,
      verifiedLists,
    } as VerifiedTokenRecord);
  }

  if (setIsSearching) {
    setIsSearching(false);
  }

  return verifiedTokens;
};

/**
 * The search-result row for the native asset.
 *
 * The native asset has no issuer, so the row carries none. That keeps the
 * canonical identifier built from this row equal to the native identifier,
 * which is what lets it match the held native balance.
 */
export const buildNativeAssetRow = (networkDetails: NetworkDetails) => {
  const nativeContractDetails = getNativeContractDetails(networkDetails);

  return {
    code: nativeContractDetails.code,
    issuer: "",
    contract: nativeContractDetails.contract,
    domain: nativeContractDetails.domain,
    name: nativeContractDetails.code,
  };
};

/**
 * A record from stellar.expert's asset search. Issued assets arrive as
 * `CODE-ISSUER-TYPE`, contract tokens as their contract id, and the native
 * asset as its bare code with no issuer and no domain.
 */
export interface StellarExpertAssetRecord {
  asset: string;
  domain?: string;
  code?: string;
  token_name?: string;
  decimals?: number;
  tomlInfo?: {
    image?: string;
    code?: string;
    issuer?: string;
    name?: string;
  };
}

/**
 * Maps a stellar.expert search record to an asset row.
 *
 * The native asset's record carries only its code, so its row is built from
 * the network's own native details instead — that gives it its contract id,
 * which is how the verified-list split and the held-balance check recognise
 * it. Every other record carries its identity (issuer or contract id) itself.
 */
export const mapStellarExpertRecord = (
  record: StellarExpertAssetRecord,
  networkDetails: NetworkDetails,
) => {
  if (isContractId(record.asset)) {
    return {
      code: record.code || record.tomlInfo?.code || "",
      issuer: record.asset,
      contract: record.asset,
      domain: record.domain ?? null,
      image: record.tomlInfo?.image,
      name: record.token_name || record.tomlInfo?.name,
      decimals: record.decimals,
      isSuspicious: false,
    };
  }

  const [code, issuer] = record.asset.split("-");

  if (isNativeAssetPair(code, issuer)) {
    return { ...buildNativeAssetRow(networkDetails), isSuspicious: false };
  }

  return {
    code,
    issuer,
    domain: record.domain ?? null,
    image: record.tomlInfo?.image,
    isSuspicious: false,
  };
};
