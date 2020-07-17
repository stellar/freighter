export const newTabHref = (path = "") => `index.html#${path}`;
export const removeQueryParam = (url = "") => url.replace(/\?(.*)/, "");
