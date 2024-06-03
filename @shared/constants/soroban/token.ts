import { NETWORKS } from "@shared/constants/stellar";

// https://github.com/stellar/soroban-examples/blob/main/token/src/contract.rs
export enum SorobanTokenInterface {
  transfer = "transfer",
  mint = "mint",
}

export type ArgsForTokenInvocation = {
  from: string;
  to: string;
  amount: bigint | number;
};

export type TokenInvocationArgs = ArgsForTokenInvocation & {
  fnName: SorobanTokenInterface;
  contractId: string;
};

// TODO: can we generate this at build time using the cli TS generator? Also should we?
export interface SorobanToken {
  // only currently holds fields we care about
  transfer: (from: string, to: string, amount: number) => void;
  mint: (to: string, amount: number) => void;
  // values below are in storage
  name: string;
  balance: number;
  symbol: string;
  decimals: number;
}

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
