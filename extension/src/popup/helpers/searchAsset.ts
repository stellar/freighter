import { fetchAssetList } from "@stellar-asset-lists/sdk";
import { NetworkDetails } from "@shared/constants/stellar";
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

export const searchTokenUrl = (networkDetails: NetworkDetails) =>
  `${getApiStellarExpertUrl(networkDetails)}/asset-list/top50`;

export const searchToken = async ({
  networkDetails,
  onError,
}: {
  networkDetails: NetworkDetails;
  onError: (e: any) => void;
}) => {
  try {
    const res = await fetchAssetList(searchTokenUrl(networkDetails));
    return res;
  } catch (e) {
    return onError(e);
  }
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

    verifiedTokens = verifiedTokenRes.assets.filter((record: TokenRecord) => {
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
