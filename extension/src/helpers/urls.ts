import punycode from "punycode";
import browser from "webextension-polyfill";
import { TransactionInfo } from "../types/transactions";

export interface MessageToSign {
  isDomainListedAllowed: boolean;
  domain: string;
  tab?: browser.Tabs.Tab;
  message: string;
  url: string;
  accountToSign: string;
  networkPassphrase?: string;
}

export interface EntryToSign {
  isDomainListedAllowed: boolean;
  domain: string;
  tab?: browser.Tabs.Tab;
  entry: string;
  url: string;
  accountToSign: string;
  networkPassphrase?: string;
}

export const encodeObject = (obj: object) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj))));

export const decodeString = (str: string) =>
  decodeURIComponent(escape(atob(str)));

export const newTabHref = (path = "", queryParams = "") =>
  `index.html#${path}${queryParams ? "?" : ""}${queryParams}`;

export const removeQueryParam = (url = "") => url.replace(/\?(.*)/, "");

export const parsedSearchParam = (
  param: string,
): TransactionInfo | MessageToSign | EntryToSign => {
  const decodedSearchParam = decodeString(param.replace("?", ""));
  return decodedSearchParam ? JSON.parse(decodedSearchParam) : {};
};

export const getUrlHostname = (url: string) => {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return "";
  }
};

export const getUrlDomain = (url: string) => {
  try {
    const u = new URL(url);
    const split = u.hostname.split(".");
    if (split.length > 2) {
      return `${split[split.length - 2]}.${split[split.length - 1]}`;
    }
    return u.hostname;
  } catch {
    return "";
  }
};

export const getPunycodedDomain = (url: string) => punycode.toASCII(url);
