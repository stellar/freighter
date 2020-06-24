export const newTabHref = (path = "") => `index.html#${path}`;
export const removeQueryParam = (url = "") => url.replace(/\?(.*)/, "");
export const truncatedPublicKey = (publicKey: string) =>
  `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
