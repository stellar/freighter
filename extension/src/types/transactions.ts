import { Tabs } from "webextension-polyfill-ts";

export interface FlaggedKeys {
  [address: string]: {
    tags: Array<string>;
  };
}

export interface TransactionInfo {
  url: string;
  tab: Tabs.Tab;
  transaction: { [key: string]: any };
  isDomainListedAllowed: boolean;
  flaggedKeys: FlaggedKeys;
  title: string;
}
