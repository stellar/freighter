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

export const searchToken = async ({
  networkDetails,
  onError,
}: {
  networkDetails: NetworkDetails;
  onError: (e: any) => void;
}) => {
  try {
    const res = await fetchAssetList(
      `${getApiStellarExpertUrl(networkDetails)}/asset-list/top50`,
    );
    return res;
  } catch (e) {
    return onError(e);
  }
};
