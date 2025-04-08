import { NetworkDetails, NETWORKS } from "@shared/constants/stellar";
import {
  AssetsLists,
  AssetsListKey,
  AssetListResponse,
  AssetListReponseItem,
} from "@shared/constants/soroban/asset-list";

import { getApiStellarExpertUrl } from "popup/helpers/account";
import { getCombinedAssetListData } from "@shared/api/helpers/getIconFromTokenLists";

export const searchAsset = async ({
  asset,
  networkDetails,
}: {
  asset: any;
  networkDetails: NetworkDetails;
}) => {
  const res = await fetch(
    `${getApiStellarExpertUrl(networkDetails)}/asset?search=${asset}`,
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
}: {
  assetsListsDetails: AssetsLists;
  networkDetails: NetworkDetails;
}) => {
  const network = networkDetails.network;
  const assetsListsDetailsByNetwork =
    assetsListsDetails[network as AssetsListKey];

  const assetListsResponses = [] as AssetListResponse[];
  for (const networkList of assetsListsDetailsByNetwork) {
    const { url, isEnabled } = networkList;

    if (isEnabled) {
      const fetchAndParse = async (): Promise<AssetListResponse> => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        return res.json();
      };

      assetListsResponses.push(await fetchAndParse());
    }
  }

  const settledResponses = await Promise.allSettled(assetListsResponses);
  return settledResponses;
};

export const getVerifiedTokens = async ({
  networkDetails,
  contractId,
  setIsSearching,
  assetsLists,
}: {
  networkDetails: NetworkDetails;
  contractId: string;
  setIsSearching?: (isSearching: boolean) => void;
  assetsLists: AssetsLists;
}) => {
  const assetListsData = await getCombinedAssetListData({
    networkDetails,
    assetsLists,
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
