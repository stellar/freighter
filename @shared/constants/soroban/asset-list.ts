import { NETWORKS } from "@shared/constants/stellar";

export type AssetsListKey = NETWORKS.PUBLIC | NETWORKS.TESTNET;

export type AssetsLists = {
  [K in AssetsListKey]: AssetsListItem[];
};

export interface AssetsListItem {
  url: string;
  isEnabled: boolean;
}

export const DEFAULT_ASSETS_LISTS: AssetsLists = {
  [NETWORKS.PUBLIC]: [
    {
      url: "https://api.stellar.expert/explorer/public/asset-list/top50",
      isEnabled: true,
    },
    {
      url: "https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json",
      isEnabled: true,
    },
    {
      url: "https://lobstr.co/api/v1/sep/assets/curated.json",
      isEnabled: true,
    },
  ],
  [NETWORKS.TESTNET]: [
    {
      url: "https://api.stellar.expert/explorer/testnet/asset-list/top50",
      isEnabled: true,
    },
  ],
};

export interface AssetListReponseItem {
  code: string;
  issuer: string;
  contract: string;
  org?: string; //org is not optional in the spec but lobstr list does not adhere in this case
  domain: string;
  icon: string;
  decimals: number;
}

export interface AssetListResponse {
  name: string;
  description: string;
  network: string;
  version: string;
  provider: string;
  assets: AssetListReponseItem[];
}
