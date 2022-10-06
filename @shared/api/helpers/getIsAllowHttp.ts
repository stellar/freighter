export const getIsAllowHttp = (networkUrl: string) =>
  !networkUrl.includes("https");
