import { fetchAssetList } from "@stellar-asset-lists/sdk";
import { NetworkDetails, NETWORKS } from "@shared/constants/stellar";
import { getApiStellarExpertUrl } from "popup/helpers/account";

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

export const searchTokenUrl = (networkDetails: NetworkDetails) =>
  `${getApiStellarExpertUrl(networkDetails)}/asset-list/top50`;

export const searchToken = async ({
  networkDetails,
  onError,
}: {
  networkDetails: NetworkDetails;
  onError: (e: any) => void;
}) => {
  let verifiedAssets = [] as TokenRecord[];
  try {
    const res: { assets: TokenRecord[] } = await fetchAssetList(
      searchTokenUrl(networkDetails),
    );
    verifiedAssets = verifiedAssets.concat(res.assets);
  } catch (e) {
    onError(e);
  }

  // add native contract to list
  verifiedAssets = verifiedAssets.concat([
    getNativeContractDetails(networkDetails),
  ]);

  return verifiedAssets;
};

export interface TokenRecord {
  code: string;
  issuer: string;
  contract: string;
  org: string;
  domain: string;
  icon: string;
  decimals: number;
}

export const getVerifiedTokens = async ({
  networkDetails,
  contractId,
  setIsSearching,
}: {
  networkDetails: NetworkDetails;
  contractId: string;
  setIsSearching?: (isSearching: boolean) => void;
}) => {
  let verifiedTokens = [] as TokenRecord[];

  const fetchVerifiedTokens = async () => {
    const verifiedTokenRes = await searchToken({
      networkDetails,
      onError: (e) => {
        console.error(e);
        if (setIsSearching) {
          setIsSearching(false);
        }
        throw new Error("Unable to search for tokens");
      },
    });

    verifiedTokens = verifiedTokenRes.filter((record: TokenRecord) => {
      const regex = new RegExp(contractId, "i");
      if (record.contract.match(regex)) {
        return true;
      }
      return false;
    });
  };

  await fetchVerifiedTokens();

  return verifiedTokens;
};
