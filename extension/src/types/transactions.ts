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
  flaggedKeys: FlaggedKeys;
  title?: string;
  accountToSign?: string;
  uuid: string;
}
