export const newTabHref = (path = "") => `index.html#${path}`;
export const removeQueryParam = (url = "") => url.replace(/\?(.*)/, "");
export const parsedSearchParam = (param: string) => {
  const decodedSearchParam = atob(param.replace("?", ""));
  return decodedSearchParam ? JSON.parse(decodedSearchParam) : {};
};
