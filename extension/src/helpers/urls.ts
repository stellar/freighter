import punycode from "punycode";
import { TransactionInfo } from "../types/transactions";

export const encodeObject = (obj: {}) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj))));

export const decodeString = (str: string) =>
  decodeURIComponent(escape(atob(str)));

export const newTabHref = (path = "", queryParams = "") =>
  `index.html#${path}${queryParams ? "?" : ""}${queryParams}`;

export const removeQueryParam = (url = "") => url.replace(/\?(.*)/, "");

export const parsedSearchParam = (param: string): TransactionInfo => {
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
