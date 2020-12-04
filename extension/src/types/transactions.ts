import { Tabs } from "webextension-polyfill-ts";

export interface TransactionInfo {
  url: string;
  tab: Tabs.Tab;
  transaction: { [key: string]: any };
  isDomainListedAllowed: boolean;
}
