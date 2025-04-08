import { captureException } from "@sentry/browser";
import {
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
  NETWORKS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  AssetsLists,
  AssetsListKey,
  AssetListResponse,
  AssetListReponseItem,
} from "@shared/constants/soroban/asset-list";

import { getApiStellarExpertUrl } from "popup/helpers/account";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";
import { schemaValidatedAssetList } from "@shared/api/helpers/getIconFromTokenLists";

export const searchAsset = async ({
  asset,
  networkDetails,
  onError,
}: {
  asset: any;
  networkDetails: NetworkDetails;
  onError: (e: any) => void;
}) => {
  try {
    const res = await fetch(
      `${getApiStellarExpertUrl(networkDetails)}/asset?search=${asset}`,
    );
    return await res.json();
  } catch (e) {
    return onError(e);
  }
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
  const nativeContract = getNativeContractDetails(networkDetails);

  if (contractId === nativeContract.contract) {
    return [{ ...nativeContract, verifiedLists: [] }];
  }

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

  const verifiedTokens = [] as VerifiedTokenRecord[];

  let verifiedToken = {} as AssetListReponseItem;
  const verifiedLists: string[] = [];

  for (const r of promiseRes) {
    if (r.status === "fulfilled") {
      // confirm that this list still adheres to the agreed upon schema
      const validatedList = await schemaValidatedAssetList(r.value);
      const list = validatedList.assets;
      if (list) {
        for (const record of list) {
          const regex = new RegExp(contractId, "i");
          if (record.contract && record.contract.match(regex)) {
            verifiedToken = record;
            verifiedLists.push(r.value.name);
            break;
          }
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
