import { NetworkDetails, NETWORKS } from "@shared/constants/stellar";
import {
  AssetsLists,
  AssetsListKey,
  AssetListResponse,
  AssetListReponseItem,
} from "@shared/constants/soroban/asset-list";

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
  switch (networkDetails.network as keyof typeof NETWORKS) {
    case NETWORKS.PUBLIC:
      return {
        ...NATIVE_CONTRACT_DEFAULTS,
        contract: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
        issuer: "GDMTVHLWJTHSUDMZVVMXXH6VJHA2ZV3HNG5LYNAZ6RTWB7GISM6PGTUV",
      };
    case NETWORKS.TESTNET:
      return {
        ...NATIVE_CONTRACT_DEFAULTS,
        contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        issuer: "",
      };
    default:
      return { ...NATIVE_CONTRACT_DEFAULTS, contract: "", issuer: "" };
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

  // Fetch sequentially to avoid parallel requests
  const settledResponses = [];
  for (const { url, isEnabled } of assetsListsDetailsByNetwork) {
    if (!isEnabled) continue;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      settledResponses.push({ status: "fulfilled" as const, value: data });
    } catch (e) {
      settledResponses.push({ status: "rejected" as const, reason: e });
    }
  }

  return settledResponses;
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
    const matchingRecord = data.assets?.find(
      (record) => record.contract === contractId,
    );
    if (matchingRecord) {
      verifiedToken = matchingRecord;
      verifiedLists.push(data.name);
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
