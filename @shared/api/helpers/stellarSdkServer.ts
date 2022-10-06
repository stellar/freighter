import StellarSdk from "stellar-sdk";

export const getIsAllowHttp = (networkUrl: string) =>
  !networkUrl.includes("https");

export const stellarSdkServer = (networkUrl: string) =>
  new StellarSdk.Server(networkUrl, {
    allowHttp: getIsAllowHttp(networkUrl),
  });
