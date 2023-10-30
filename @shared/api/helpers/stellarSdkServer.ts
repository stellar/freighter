import { Horizon } from "stellar-sdk";

export const getIsAllowHttp = (networkUrl: string) =>
  !networkUrl.includes("https");

export const stellarSdkServer = (networkUrl: string) =>
  new Horizon.Server(networkUrl, {
    allowHttp: getIsAllowHttp(networkUrl),
  });
