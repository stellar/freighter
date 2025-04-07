import { BalanceToMigrate } from "@shared/api/types";

export interface FlaggedKeys {
  [address: string]: {
    tags: Array<string>;
  };
}

export interface TransactionInfo {
  url: string;
  tab: any;
  transaction: { [key: string]: any };
  transactionXdr: string;
  isDomainListedAllowed: boolean;
  flaggedKeys: FlaggedKeys;
  title?: string;
  accountToSign?: string;
}

export interface TransactionData {
  amount: string;
  asset: string;
  decimals?: number;
  destination: string;
  federationAddress: string;
  transactionFee: string;
  transactionTimeout: number;
  memo?: string;
  destinationAsset: string;
  destinationDecimals?: number;
  destinationAmount: string;
  destinationIcon: string;
  path: string[];
  allowedSlippage: string;
  isToken: boolean;
  isMergeSelected?: boolean;
  balancesToMigrate?: BalanceToMigrate[];
  isSoroswap: boolean;
}
