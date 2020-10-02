import punycode from "punycode";

export const newTabHref = (path = "") => `index.html#${path}`;

export const removeQueryParam = (url = "") => url.replace(/\?(.*)/, "");

export const parsedSearchParam = (param: string) => {
  const decodedSearchParam = atob(param.replace("?", ""));
  return decodedSearchParam ? JSON.parse(decodedSearchParam) : {};
};

export const getUrlHostname = (url: string) => {
  const u = new URL(url);
  return u.hostname;
};

export const getPunycodedDomain = (url: string) => punycode.toASCII(url);
